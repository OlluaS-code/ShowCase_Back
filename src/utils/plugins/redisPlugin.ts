import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import Redis from "ioredis";
import { config } from "../settings/config";

/**
 * Plugin centralizado de conexão Redis.
 *
 * Gerencia uma única instância do cliente ioredis compartilhada globalmente
 * via `fastify.redis`. Elimina conexões TCP fantasma espalhadas pelo código.
 *
 * Ciclo de vida:
 * - Bootstrap: abre uma única conexão TCP ao Redis.
 * - onClose: libera o pool de sockets de forma controlada (Graceful Shutdown).
 */
export const redisPlugin = fp(async (fastify: FastifyInstance) => {
  const redisClient = new Redis({
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    maxRetriesPerRequest: 3,
    connectTimeout: 5000,
    // Evita que o ioredis gere erros não capturados ao perder conexão
    lazyConnect: false,
  });

  redisClient.on("error", (err) => {
    fastify.log.error({ err }, "Redis: Erro de conexão");
  });

  redisClient.on("connect", () => {
    fastify.log.info("Redis: Conexão estabelecida com sucesso");
  });

  // Decora a instância do Fastify para acesso global tipado
  fastify.decorate("redis", redisClient);

  // Graceful Shutdown: encerra a conexão de forma limpa ao desligar o servidor
  fastify.addHook("onClose", async () => {
    await redisClient.quit();
    fastify.log.info("Redis: Conexão encerrada (Graceful Shutdown)");
  });
}, {
  name: "app-redis-connector",
  fastify: "5.x",
});
