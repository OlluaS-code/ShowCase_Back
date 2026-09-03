import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import server from '../../src/server';
import { FastifyInstance } from 'fastify';
import { AppDataSource } from '../../src/utils/settings/data-source';
import { AdminUserEntity, VisitorUserEntity } from '../../src/database/migrations/user.entity';

describe('Admin API - E2E [Autorização]', () => {
  let app: FastifyInstance;
  let visitorToken: string;
  let adminToken: string;

  beforeEach(async () => {
    app = server;
    
    // Routes are already registered globally in setupFiles.ts

    const argon2 = require('argon2');
    const hashedPass = await argon2.hash('SuperS3cr3t!@#');

    // 1. Visitor User Seed
    const visitorEmail = `visitor_${Date.now()}@gmail.com`;
    const visitorRepo = AppDataSource.getRepository(VisitorUserEntity);
    const visitor = new VisitorUserEntity('Visitor Test', visitorEmail, hashedPass);
    visitor.status = 'ACTIVE';
    await visitorRepo.save(visitor);

    // 2. Admin User Seed
    const adminEmail = `admin_${Date.now()}@gmail.com`;
    const adminRepo = AppDataSource.getRepository(AdminUserEntity);
    const admin = new AdminUserEntity('Admin Test', adminEmail, hashedPass);
    admin.status = 'ACTIVE';
    await adminRepo.save(admin);

    // Login Visitor
    const visitorLogin = await app.inject({
      method: 'POST',
      url: '/users/login',
      payload: { email: visitorEmail, passwordPlain: 'SuperS3cr3t!@#' },
    });
    visitorToken = JSON.parse(visitorLogin.body).accessToken;

    // Login Admin via TokenService para E2E
    const { TokenService } = await import('../../src/utils/middlewares/TokenService');
    const crypto = await import('crypto');
    const jti = crypto.randomUUID();
    adminToken = TokenService.generateAccessToken({ sub: admin.id, email: admin.email, role: 'ADMIN', jti });
    await app.redis.setex(`user:session:${admin.id}:${jti}`, 604800, "active");
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve bloquear (403/401) geração de link administrativo por usuário visitante', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/generate-link',
      headers: { authorization: `Bearer ${visitorToken}` },
      payload: { path: '/admin-dashboard' },
    });

    // Como o Visitor tenta acessar adminGuard, deve retornar Unauthorized ou Forbidden
    expect([401, 403]).toContain(response.statusCode);
  });

  it('deve gerar link seguro assinado para um usuário administrativo válido', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/generate-link',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { path: '/admin-dashboard' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.signedUrl).toBeDefined();
    expect(typeof body.signedUrl).toBe('string');
    expect(body.signedUrl).toContain('signature=');
  });
});
