import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import server from '../../src/server';
import { FastifyInstance } from 'fastify';
import { DataSource } from 'typeorm';
import { PublicationEntity } from '../../src/database/migrations/publication.entity';
import { UserEntity, AdminUserEntity, VisitorUserEntity } from '../../src/database/migrations/user.entity';
import { InteractionEntity } from '../../src/database/migrations/interaction.entity';
import { NotificationEntity } from '../../src/database/migrations/notification.entity';
import { SpecificationEntity } from '../../src/database/migrations/specification.entity';
import { AppDataSource } from '../../src/utils/settings/data-source';
import { ResolveMXService } from '../../src/core/email/resolveMXRecords.service';
import { EmailVerificationService } from '../../src/core/email/verifyEmailWithAbstract.service';

describe('Publications Flow & Cache Invalidation - E2E', () => {
  let app: FastifyInstance;
  let db: DataSource;
  let authToken: string;

  beforeEach(async () => {
    vi.spyOn(ResolveMXService.prototype, 'isValid').mockResolvedValue(true);
    vi.spyOn(EmailVerificationService, 'isDeliverable').mockResolvedValue(true);

    app = server;
    
    db = AppDataSource;

    // Create an Admin user directly in the database
    const uniqueEmail = `creator_${Date.now()}@gmail.com`;
    const adminRepo = db.getRepository(AdminUserEntity);
    const argon2 = require('argon2');
    const hashedPass = await argon2.hash('SuperS3cr3t!@#');
    const adminUser = new AdminUserEntity('Publi Creator', uniqueEmail, hashedPass);
    adminUser.status = 'ACTIVE';
    await adminRepo.save(adminUser);

    const { TokenService } = await import('../../src/utils/middlewares/TokenService');
    const crypto = await import('crypto');
    const jti = crypto.randomUUID();
    authToken = TokenService.generateAccessToken({ sub: adminUser.id, email: adminUser.email, role: 'ADMIN', jti });
    await app.redis.setex(`user:session:${adminUser.id}:${jti}`, 604800, "active");
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve criar uma publicação e inseri-la no banco de dados', async () => {
    const payload = {
      title: 'Post de Teste E2E',
      content: 'Validando o fluxo de ponta-a-ponta do backend.',
      category: 'Frontend',
      media: [{ url: 'https://example.com/image.png', type: 'image' }]
    };

    const response = await app.inject({
      method: 'POST',
      url: '/publications',
      remoteAddress: '10.0.0.3',
      headers: { authorization: `Bearer ${authToken}` },
      payload,
    });

    expect(response.statusCode).toBe(201);
    
    const repo = db.getRepository(PublicationEntity);
    const count = await repo.count();
    expect(count).toBeGreaterThan(0);
  });
});
