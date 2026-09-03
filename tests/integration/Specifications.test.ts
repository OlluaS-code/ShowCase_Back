import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import server from '../../src/server';
import { FastifyInstance } from 'fastify';
import { AppDataSource } from '../../src/utils/settings/data-source';
import { AdminUserEntity } from '../../src/database/migrations/user.entity';

describe('Specifications API - E2E', () => {
  let app: FastifyInstance;
  let adminToken: string;

  beforeEach(async () => {
    app = server;
    
    // Routes are registered globally in setupFiles.ts

    const argon2 = require('argon2');
    const hashedPass = await argon2.hash('SuperS3cr3t!@#');

    const adminEmail = `admin_spec_${Date.now()}@gmail.com`;
    const adminRepo = AppDataSource.getRepository(AdminUserEntity);
    const admin = new AdminUserEntity('Admin Test', adminEmail, hashedPass);
    admin.status = 'ACTIVE';
    await adminRepo.save(admin);

    const { TokenService } = await import('../../src/utils/middlewares/TokenService');
    const crypto = await import('crypto');
    const jti = crypto.randomUUID();
    adminToken = TokenService.generateAccessToken({ sub: admin.id, email: admin.email, role: 'ADMIN', jti });
    await app.redis.setex(`user:session:${admin.id}:${jti}`, 604800, "active");
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve criar uma nova specification como administrador', async () => {
    const payload = {
      tag: 'NewFeature',
      title: 'Especificação Teste E2E',
      description: 'Testando rotas de Specification',
      iconSvg: '<svg></svg>',
      isWide: true,
      order: 1
    };

    const response = await app.inject({
      method: 'POST',
      url: '/specifications',
      headers: { authorization: `Bearer ${adminToken}` },
      payload,
    });

    // Como as rotas originais podem estar definidas com diferentes caminhos/roles. 
    // Precisaríamos ver se o SpecRoutes de fato tem POST /specs. 
    // Assumimos 201 ou 403 se falhar
    if (response.statusCode !== 201 && response.statusCode !== 200) {
      console.log("Response body for Specs:", response.body);
    }
    
    expect([200, 201]).toContain(response.statusCode);
  });
});
