import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import server from '../../src/server';
import { FastifyInstance } from 'fastify';
import { AppDataSource } from '../../src/utils/settings/data-source';
import { VisitorUserEntity } from '../../src/database/migrations/user.entity';
import { PublicationEntity } from '../../src/database/migrations/publication.entity';

describe('Interactions API - E2E', () => {
  let app: FastifyInstance;
  let userToken: string;
  let publicationId: string;

  beforeEach(async () => {
    app = server;
    
    // Routes are registered globally in setupFiles.ts

    const argon2 = require('argon2');
    const hashedPass = await argon2.hash('SuperS3cr3t!@#');

    const userEmail = `user_interaction_${Date.now()}@gmail.com`;
    const userRepo = AppDataSource.getRepository(VisitorUserEntity);
    const user = new VisitorUserEntity('Interaction Test', userEmail, hashedPass);
    user.status = 'ACTIVE';
    await userRepo.save(user);

    const loginRes = await app.inject({
      method: 'POST',
      url: '/users/login',
      payload: { email: userEmail, passwordPlain: 'SuperS3cr3t!@#' },
    });
    userToken = JSON.parse(loginRes.body).accessToken;

    // Criar publicação simulada para podermos dar "Like"
    const pubRepo = AppDataSource.getRepository(PublicationEntity);
    const pub = new PublicationEntity();
    pub.title = "Post E2E Interaction";
    pub.content = "Content Interaction";
    pub.category = "Backend" as any;
    pub.media = [];
    await pubRepo.save(pub);
    publicationId = pub.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve realizar LIKE em uma publicação existente', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/interactions/like',
      headers: { authorization: `Bearer ${userToken}` },
      payload: { publicationId }
    });

    // Pode retornar 201 ou 200 dependendo de ser LIKE ou UNLIKE
    expect([200, 201]).toContain(response.statusCode);
  });
});
