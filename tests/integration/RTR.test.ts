import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import { config } from '../../src/utils/settings/config';

interface SessionTokenPayload {
  userId: string;
  jti: string;
  familyId: string;
}

describe('Esteira de Segurança - Rotação e Revogação de Refresh Tokens (RTR)', () => {
  let redis: Redis;
  const JWT_TEST_SECRET = 'ultra-secure-test-signing-key';

  beforeAll(async () => {
    redis = new Redis({
      host: config.TEST_REDIS_HOST || '127.0.0.1',
      port: config.TEST_REDIS_PORT || 6379,
    });
  });

  beforeEach(async () => {
    try { await redis.flushdb(); } catch(e) {}
  });

  afterAll(async () => {
    if (redis) await redis.quit();
  });

  const createRefreshToken = (userId: string, jti: string, familyId: string): string => {
    return jwt.sign({ userId, jti, familyId } as SessionTokenPayload, JWT_TEST_SECRET, { expiresIn: '10m' });
  };

  const executeRotationFlow = async (
    refreshTokenStr: string
  ): Promise<{ success: boolean; newAccessToken?: string; newRefreshToken?: string; message?: string }> => {
    try {
      const decoded = jwt.verify(refreshTokenStr, JWT_TEST_SECRET) as SessionTokenPayload;

      const isBanned = await redis.get(`banned_family:${decoded.familyId}`);
      if (isBanned) {
        return { success: false, message: 'REVOKED_COMPROMISED_SESSION_FAMILY' };
      }

      const isUsed = await redis.get(`used_jti:${decoded.jti}`);
      if (isUsed) {
        await redis.setex(`banned_family:${decoded.familyId}`, 3600, 'compromised');
        return { success: false, message: 'REVOKED_COMPROMISED_SESSION_FAMILY' };
      }

      await redis.setex(`used_jti:${decoded.jti}`, 600, 'true');

      const nextJti = `jti_${Math.random().toString(36).substring(2, 9)}`;
      const nextRefreshToken = createRefreshToken(decoded.userId, nextJti, decoded.familyId);
      const newAccessToken = jwt.sign({ userId: decoded.userId }, JWT_TEST_SECRET, { expiresIn: '15s' });

      return {
        success: true,
        newAccessToken,
        newRefreshToken: nextRefreshToken,
      };
    } catch {
      return { success: false, message: 'INVALID_TOKEN' };
    }
  };

  it('deve permitir a rotação de tokens legítimos, registrando o JTI original como utilizado', async () => {
    const userId = 'usr_789';
    const familyId = 'family_alpha';
    const originalJti = 'jti_001';

    const token = createRefreshToken(userId, originalJti, familyId);

    const rotationResult = await executeRotationFlow(token);

    expect(rotationResult.success).toBe(true);
    expect(rotationResult.newRefreshToken).toBeDefined();

    const statusJti = await redis.get(`used_jti:${originalJti}`);
    expect(statusJti).toBe('true');
  });

  it('deve revogar imediatamente toda a linhagem familiar de sessões ao identificar reuso de JTI', async () => {
    const userId = 'usr_789';
    const familyId = 'family_alpha';
    const originalJti = 'jti_001';

    const token = createRefreshToken(userId, originalJti, familyId);

    const firstExchange = await executeRotationFlow(token);
    expect(firstExchange.success).toBe(true);

    const secondExchange = await executeRotationFlow(token);
    expect(secondExchange.success).toBe(false);
    expect(secondExchange.message).toBe('REVOKED_COMPROMISED_SESSION_FAMILY');

    const banStatus = await redis.get(`banned_family:${familyId}`);
    expect(banStatus).toBe('compromised');

    const secondGenToken = firstExchange.newRefreshToken!;
    const testBlockedAccess = await executeRotationFlow(secondGenToken);
    expect(testBlockedAccess.success).toBe(false);
    expect(testBlockedAccess.message).toBe('REVOKED_COMPROMISED_SESSION_FAMILY');
  });
});
