import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import fs from 'fs';
import server from '../../src/server';
import { FastifyInstance } from 'fastify';
import { DataSource } from 'typeorm';
import { UserEntity, AdminUserEntity, VisitorUserEntity } from '../../src/database/migrations/user.entity';
import { InteractionEntity } from '../../src/database/migrations/interaction.entity';
import { NotificationEntity } from '../../src/database/migrations/notification.entity';
import { PublicationEntity } from '../../src/database/migrations/publication.entity';
import { SpecificationEntity } from '../../src/database/migrations/specification.entity';
import { AppDataSource } from '../../src/utils/settings/data-source';
import { ResolveMXService } from '../../src/core/email/resolveMXRecords.service';
import { EmailVerificationService } from '../../src/core/email/verifyEmailWithAbstract.service';

describe('Auth Flow & Rate Limit - E2E', () => {
  let app: FastifyInstance;
  let db: DataSource;

  beforeAll(async () => {
    vi.spyOn(ResolveMXService, 'getInstance').mockReturnValue({
      isValid: vi.fn().mockResolvedValue(true)
    } as any);
    vi.spyOn(EmailVerificationService, 'isDeliverable').mockResolvedValue(true);

    app = server;
    db = AppDataSource;
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve registrar um usuário no Postgres', async () => {
    const uniqueEmail = `testuser_${Date.now()}@gmail.com`;
    const payload = {
      name: 'Test User',
      email: uniqueEmail,
      passwordPlain: 'SuperS3cr3t!@#',
    };

    const response = await app.inject({
      method: 'POST',
      url: '/users/register',
      remoteAddress: '10.0.0.1',
      payload,
    });

    if (response.statusCode !== 201) {
      console.error('Error Body:', response.body);
      fs.writeFileSync('AuthFlow_error.log', response.body);
    }

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.email).toBe(payload.email);
    expect(body.id).toBeDefined();
    
    // Valida diretamente no banco de dados se a senha foi hasheada
    const repo = db.getRepository(UserEntity);
    const userInDb = await repo.findOne({ where: { email: payload.email } });
    expect(userInDb).toBeDefined();
    expect(userInDb?.passwordHash).not.toBe(payload.passwordPlain);
  });

  it('deve bloquear múltiplas tentativas seguidas de registro (Rate Limit 429)', async () => {
    // Tenta 6 vezes seguidas o cadastro com emails diferentes para burlar regras de duplicação, 
    // mas usando o mesmo IP simulado pelo inject
    let lastStatusCode = 0;
    
    for (let i = 0; i < 6; i++) {
      const response = await app.inject({
        method: 'POST',
        url: '/users/register',
        remoteAddress: '10.0.0.2',
        payload: {
          name: 'Spammer',
          email: `spammer${i}@gmail.com`,
          passwordPlain: 'SuperS3cr3t!@#',
        },
      });
      lastStatusCode = response.statusCode;
    }
    
    // A 6ª tentativa deve estourar o limite de 5. 
    expect(lastStatusCode).toBe(429);
  });
});
