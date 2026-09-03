import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { TypeBoxTypeProvider, TypeBoxValidatorCompiler } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';

const buildTestServer = (): FastifyInstance => {
  const server = Fastify().withTypeProvider<TypeBoxTypeProvider>();
  
  server.setValidatorCompiler(TypeBoxValidatorCompiler);

  server.post(
    '/users',
    {
      schema: {
        body: Type.Object({
          username: Type.String({ minLength: 3 }),
          email: Type.String({ format: 'email' }),
          role: Type.Union([Type.Literal('admin'), Type.Literal('user')]),
        }),
      },
    },
    async (request, reply) => {
      const { username, email, role } = request.body;
      return reply.code(201).send({ status: 'SUCCESS', data: { username, email, role } });
    }
  );

  return server;
};

describe('Ciclo de Vida Fastify v5 - Validação JIT de Entrada', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildTestServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve aprovar requisições válidas e passar os parâmetros higienizados para o controller', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/users',
      payload: {
        username: 'dev_expert',
        email: 'expert@tech.com',
        role: 'admin',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('SUCCESS');
    expect(body.data.username).toBe('dev_expert');
  });

  it('deve interceptar e rejeitar automaticamente inputs inválidos sem invocar o controller', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/users',
      payload: {
        username: 'ex',
        email: 'formato-invalido',
        role: 'guest',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Bad Request');
    expect(body.message).toContain('body/username');
  });
});
