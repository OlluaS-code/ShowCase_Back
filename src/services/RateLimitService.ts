import { Redis } from "ioredis";

export class RateLimitService {
  constructor(private readonly redis: Redis) {}

  public async checkLimit(
    ip: string,
    username: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; count: number }> {
    const key = `ratelimit:${ip}:${username}`;
    const now = Date.now();
    const clearBefore = now - windowSeconds * 1000;

    // Script Lua para garantir atomicidade completa na janela deslizante (Sliding Window Log)
    const luaScript = `
      redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, ARGV[1])
      redis.call('ZADD', KEYS[1], ARGV[2], ARGV[2])
      local count = redis.call('ZCARD', KEYS[1])
      redis.call('EXPIRE', KEYS[1], ARGV[3])
      return count
    `;

    const result = await this.redis.eval(
      luaScript,
      1,
      key,
      clearBefore.toString(),
      now.toString(),
      windowSeconds.toString()
    );

    const count = result as number;
    const allowed = count <= limit;

    return { allowed, count };
  }
}
