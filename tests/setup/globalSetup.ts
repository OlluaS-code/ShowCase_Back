import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { AppConfig } from '../../src/utils/settings/config';

let postgres: StartedPostgreSqlContainer;
let redis: StartedRedisContainer;

export async function setup() {
  console.log('\n[Orquestrador de Infraestrutura] Subindo contêineres Docker...');

  try {
    const [startedPg, startedRedis] = await Promise.all([
      new PostgreSqlContainer('postgres:16-alpine')
        .withDatabase('high_perf_test_db')
        .withUsername('db_user')
        .withPassword('db_pass')
        .start(),
      new RedisContainer('redis:7-alpine')
        .start(),
    ]);

    postgres = startedPg;
    redis = startedRedis;

    AppConfig.setEnv('TEST_PG_HOST', postgres.getHost());
    AppConfig.setEnv('TEST_PG_PORT', String(postgres.getMappedPort(5432)));
    AppConfig.setEnv('TEST_PG_USER', 'db_user');
    AppConfig.setEnv('TEST_PG_PASS', 'db_pass');
    AppConfig.setEnv('TEST_PG_DB', 'high_perf_test_db');

    AppConfig.setEnv('TEST_REDIS_HOST', redis.getHost());
    AppConfig.setEnv('TEST_REDIS_PORT', String(redis.getMappedPort(6379)));

    const fs = require('fs');
    const path = require('path');
    fs.writeFileSync(
      path.join(__dirname, '.test-env.json'), 
      JSON.stringify({
        TEST_PG_HOST: postgres.getHost(),
        TEST_PG_PORT: String(postgres.getMappedPort(5432)),
        TEST_PG_USER: 'db_user',
        TEST_PG_PASS: 'db_pass',
        TEST_PG_DB: 'high_perf_test_db',
        TEST_REDIS_HOST: redis.getHost(),
        TEST_REDIS_PORT: String(redis.getMappedPort(6379))
      })
    );

    console.log(`[Orquestrador] Postgres pronto na porta: ${postgres.getMappedPort(5432)}`);
    console.log(`[Orquestrador] Redis pronto na porta: ${redis.getMappedPort(6379)}`);
  } catch (err) {
    console.error('[Orquestrador] Falha ao iniciar contêineres.', err);
    throw err;
  }
}

export async function teardown() {
  console.log('\n[Orquestrador de Infraestrutura] Derrubando contêineres e realizando limpeza...');
  try {
    if (postgres) await postgres.stop();
    if (redis) await redis.stop();
  } catch (err) {
    console.error('[Orquestrador] Erro no teardown', err);
  }
  console.log('[Orquestrador] Saneamento de recursos finalizado.');
}
