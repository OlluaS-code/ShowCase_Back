import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Redis from 'ioredis';
import { UrlSigner } from '../../src/core/security/UrlSigner';
import { config } from '../../src/utils/settings/config';

describe('UrlSigner - Unit/Integration Tests', () => {
  let redis: Redis;
  const validSecretHex = Buffer.from('my_secret_key_that_is_at_least_32_bytes_long_which_is_secure').toString('hex');

  beforeAll(async () => {
    redis = new Redis({
      host: config.TEST_REDIS_HOST || '127.0.0.1',
      port: config.TEST_REDIS_PORT || 6379,
    });
  });

  afterAll(async () => {
    await redis.quit();
  });

  it('deve lançar erro no construtor se a chave tiver menos de 32 bytes (64 caracteres hexadecimais)', () => {
    const invalidSecret = Buffer.from('short_key').toString('hex'); // Menos de 64 chars
    expect(() => new UrlSigner(invalidSecret, redis)).toThrowError(
      /A chave HMAC deve ter no mínimo 32 bytes/
    );
  });

  it('deve gerar uma URL assinada válida e validá-la com sucesso', async () => {
    const signer = new UrlSigner(validSecretHex, redis, 5000);
    const path = '/admin/dashboard';
    
    const signedUrl = signer.signUrl(path);
    expect(signedUrl).toContain('?timestamp=');
    expect(signedUrl).toContain('&nonce=');
    expect(signedUrl).toContain('&signature=');

    // Extrai os parâmetros
    const urlObj = new URL(`http://localhost${signedUrl}`);
    const query = {
      timestamp: urlObj.searchParams.get('timestamp') || undefined,
      nonce: urlObj.searchParams.get('nonce') || undefined,
      signature: urlObj.searchParams.get('signature') || undefined,
    };

    const isValid = await signer.verifyUrl(path, query);
    expect(isValid).toBe(true);
  });

  it('deve rejeitar uma URL cuja janela de tempo expirou (Drift > Tolerância)', async () => {
    const signer = new UrlSigner(validSecretHex, redis, 100); // 100ms de tolerância
    const path = '/admin/dashboard';
    
    const signedUrl = signer.signUrl(path);
    const urlObj = new URL(`http://localhost${signedUrl}`);
    const query = {
      timestamp: urlObj.searchParams.get('timestamp') || undefined,
      nonce: urlObj.searchParams.get('nonce') || undefined,
      signature: urlObj.searchParams.get('signature') || undefined,
    };

    // Força o relógio a "esperar" além da tolerância antes de verificar
    await new Promise(resolve => setTimeout(resolve, 150));

    const isValid = await signer.verifyUrl(path, query);
    expect(isValid).toBe(false);
  });

  it('deve bloquear ataques de Replay (mesmo nonce não pode ser reutilizado)', async () => {
    const signer = new UrlSigner(validSecretHex, redis, 5000);
    const path = '/admin/dashboard';
    
    const signedUrl = signer.signUrl(path);
    const urlObj = new URL(`http://localhost${signedUrl}`);
    const query = {
      timestamp: urlObj.searchParams.get('timestamp') || undefined,
      nonce: urlObj.searchParams.get('nonce') || undefined,
      signature: urlObj.searchParams.get('signature') || undefined,
    };

    // Primeira tentativa passa
    const firstCheck = await signer.verifyUrl(path, query);
    expect(firstCheck).toBe(true);

    // Segunda tentativa falha devido ao bloqueio de Replay (nonce consumido)
    const secondCheck = await signer.verifyUrl(path, query);
    expect(secondCheck).toBe(false);
  });

  it('deve rejeitar validações em que a assinatura HMAC foi corrompida ou alterada (Timing-Safe Guard)', async () => {
    const signer = new UrlSigner(validSecretHex, redis, 5000);
    const path = '/admin/dashboard';
    
    const signedUrl = signer.signUrl(path);
    const urlObj = new URL(`http://localhost${signedUrl}`);
    const query = {
      timestamp: urlObj.searchParams.get('timestamp') || undefined,
      nonce: urlObj.searchParams.get('nonce') || undefined,
      signature: 'bad_signature_12345'
    };

    const isValid = await signer.verifyUrl(path, query);
    expect(isValid).toBe(false);
  });
});
