import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../src/utils/settings/config';

class DistributedMutex {
  private redis: Redis;
  private key: string;
  private token: string;
  private ttl: number;

  constructor(redis: Redis, key: string, ttlMs = 1000) {
    this.redis = redis;
    this.key = `lock:${key}`;
    this.token = uuidv4();
    this.ttl = ttlMs;
  }

  async acquire(): Promise<boolean> {
    const result = await this.redis.set(this.key, this.token, 'PX', this.ttl, 'NX');
    return result === 'OK';
  }

  async release(): Promise<boolean> {
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    const result = await this.redis.eval(luaScript, 1, this.key, this.token);
    return result === 1;
  }
}

describe('Teste de Estresse de Concorrência - Mutex Lock Distribuído', () => {
  let redis: Redis;

  beforeAll(async () => {
    redis = new Redis({
      host: config.TEST_REDIS_HOST || '127.0.0.1',
      port: config.TEST_REDIS_PORT || 6379,
      maxRetriesPerRequest: null,
    });
    try {
      await redis.flushdb();
    } catch(e) {}
  });

  afterAll(async () => {
    if (redis) await redis.quit();
  });

  it('deve bloquear colisões concorrentes de alteração de estoque', async () => {
    const resourceId = 'sku:premium-ticket:001';
    const lockKey = 'lock:premium-ticket:001';
    
    await redis.set(`stock:${resourceId}`, '1');

    const totalRequests = 100;
    let successfulTransactions = 0;
    let failedAcquisitions = 0;

    const executeConcurrentPurchase = async () => {
      const mutex = new DistributedMutex(redis, lockKey, 2000);
      const isLocked = await mutex.acquire();

      if (!isLocked) {
        failedAcquisitions++;
        return;
      }

      try {
        const currentStock = Number(await redis.get(`stock:${resourceId}`));
        if (currentStock > 0) {
          await new Promise((resolve) => setTimeout(resolve, 15));
          await redis.set(`stock:${resourceId}`, String(currentStock - 1));
          successfulTransactions++;
        }
      } finally {
        await mutex.release();
      }
    };

    await Promise.all(
      Array.from({ length: totalRequests }).map(() => executeConcurrentPurchase())
    );

    const finalStock = Number(await redis.get(`stock:${resourceId}`));

    expect(finalStock).toBe(0);
    expect(successfulTransactions).toBe(1);
    expect(failedAcquisitions).toBe(99);
  });
});
