import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import server from '../../src/server';
import { FastifyInstance } from 'fastify';
import { AppDataSource } from '../../src/utils/settings/data-source';
import { VisitorUserEntity } from '../../src/database/migrations/user.entity';

describe('Notifications API - E2E', () => {
  let app: FastifyInstance;
  let userToken: string;

  beforeEach(async () => {
    app = server;
    
    // Routes are registered globally in setupFiles.ts

    const argon2 = require('argon2');
    const hashedPass = await argon2.hash('SuperS3cr3t!@#');

    const userEmail = `user_notif_${Date.now()}@gmail.com`;
    const userRepo = AppDataSource.getRepository(VisitorUserEntity);
    const user = new VisitorUserEntity('Notif Test', userEmail, hashedPass);
    user.status = 'ACTIVE';
    await userRepo.save(user);

    const loginRes = await app.inject({
      method: 'POST',
      url: '/users/login',
      payload: { email: userEmail, passwordPlain: 'SuperS3cr3t!@#' },
    });
    userToken = JSON.parse(loginRes.body).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve listar notificações vazias para um novo usuário', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/notifications/',
      headers: { authorization: `Bearer ${userToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(0);
  });
});
