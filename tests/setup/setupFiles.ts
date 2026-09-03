import { beforeAll, beforeEach, afterAll } from 'vitest';
import Redis from 'ioredis';
import { AppConfig, config } from '../../src/utils/settings/config';
import { InteractionEntity } from '../../src/database/migrations/interaction.entity';
import { NotificationEntity } from '../../src/database/migrations/notification.entity';
import { PublicationEntity } from '../../src/database/migrations/publication.entity';
import { SpecificationEntity } from '../../src/database/migrations/specification.entity';
import { UserEntity, AdminUserEntity, VisitorUserEntity } from '../../src/database/migrations/user.entity';
import { AppDataSource } from '../../src/utils/settings/data-source';

import fs from 'fs';
import path from 'path';

let redisClient: Redis;

beforeAll(async () => {
  let testEnv: any = {};
  try {
    testEnv = JSON.parse(fs.readFileSync(path.join(__dirname, '.test-env.json'), 'utf-8'));
  } catch (e) {
    console.error("Test env file missing!");
  }

  // Previne que a URL do banco principal sobrescreva as configurações do Testcontainers
  Object.assign(AppDataSource.options, { url: undefined });

  AppDataSource.setOptions({
    type: 'postgres',
    host: testEnv.TEST_PG_HOST || config.TEST_PG_HOST,
    port: Number(testEnv.TEST_PG_PORT || config.TEST_PG_PORT),
    username: testEnv.TEST_PG_USER || config.TEST_PG_USER,
    password: testEnv.TEST_PG_PASS || config.TEST_PG_PASS,
    database: testEnv.TEST_PG_DB || config.TEST_PG_DB,
    synchronize: true, // Sincroniza schemas automaticamente nos testes
    dropSchema: true,
    entities: [
      InteractionEntity,
      NotificationEntity,
      PublicationEntity,
      SpecificationEntity,
      UserEntity,
      AdminUserEntity,
      VisitorUserEntity
    ],
    logging: false,
  });

  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
  } catch (error) {
    console.warn("DB Initialization failed. Skipping DB tests setup.", error);
  }

  try {
    redisClient = new Redis({
      host: testEnv.TEST_REDIS_HOST || config.TEST_REDIS_HOST,
      port: Number(testEnv.TEST_REDIS_PORT || config.TEST_REDIS_PORT),
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });
    await redisClient.connect();
  } catch (error) {
    console.warn("Redis Connection failed. Skipping Redis setup.");
  }

  // Inject Testcontainers ports into standard env vars so plugins (like redisPlugin) connect to the right containers
  AppConfig.setEnv('REDIS_HOST', testEnv.TEST_REDIS_HOST || config.TEST_REDIS_HOST);
  AppConfig.setEnv('REDIS_PORT', String(testEnv.TEST_REDIS_PORT || config.TEST_REDIS_PORT));
  AppConfig.setEnv('PG_HOST', testEnv.TEST_PG_HOST || config.TEST_PG_HOST);
  AppConfig.setEnv('PG_PORT', String(testEnv.TEST_PG_PORT || config.TEST_PG_PORT));

  // Register all routes globally for the shared fastify instance
  const server = (await import('../../src/server')).default;
  if (!server.hasDecorator('db')) {
    server.decorate('db', AppDataSource);

    const { adminRoutes } = await import('../../src/api/routes/AdminRoutes');
    const { interactionRoutes } = await import('../../src/api/routes/InteractionRoutes');
    const { notificationRoutes } = await import('../../src/api/routes/NotificationRoutes');
    const { publiRoutes } = await import('../../src/api/routes/PubliRoutes');
    const { specRoutes } = await import('../../src/api/routes/SpecRoutes');
    const { userRoutes } = await import('../../src/api/routes/UserRoutes');

    server.register(userRoutes, { prefix: '/users' });
    server.register(publiRoutes, { prefix: '/publications' });
    server.register(interactionRoutes, { prefix: '/interactions' });
    server.register(notificationRoutes, { prefix: '/notifications' });
    server.register(adminRoutes, { prefix: '/api/admin' });
    server.register(specRoutes, { prefix: '/specifications' });

    await server.ready();
  }
});

beforeEach(async () => {
  if (AppDataSource && AppDataSource.isInitialized) {
    const entities = AppDataSource.entityMetadatas;
    const tables = entities.map((e) => `"${e.tableName}"`).join(', ');

    if (tables.length > 0) {
      await AppDataSource.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE;`);
    }
  }

  if (redisClient && redisClient.status === 'ready') {
    await redisClient.flushdb();
  }
});

afterAll(async () => {
  if (AppDataSource && AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  if (redisClient) {
    await redisClient.quit();
  }
});
