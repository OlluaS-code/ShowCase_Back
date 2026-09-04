import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import Redis from "ioredis";
import { config } from "../settings/config";

export const redisPlugin = fp(async (fastify: FastifyInstance) => {
  // Se config.REDIS_URL existir (Upstash na nuvem), usa ela com TLS
  // Senão, cai de forma limpa no host/port (Docker local)
  const redisClient = config.REDIS_URL
    ? new Redis(config.REDIS_URL, {
        tls: config.REDIS_URL.startsWith("rediss://") ? { rejectUnauthorized: false } : undefined,
        maxRetriesPerRequest: 3,
        connectTimeout: 10000,
        lazyConnect: false,
      })
    : new Redis({
        host: config.REDIS_HOST,
        port: config.REDIS_PORT,
        maxRetriesPerRequest: 3,
        connectTimeout: 5000,
        lazyConnect: false,
      });

  redisClient.on("error", (err) => {
    fastify.log.error({ err: err.message }, "Redis: Alerta de conexão");
  });

  redisClient.on("connect", () => {
    fastify.log.info("Redis: Conexão estabelecida com sucesso");
  });

  fastify.decorate("redis", redisClient);

  fastify.addHook("onClose", async () => {
    await redisClient.quit();
    fastify.log.info("Redis: Conexão encerrada");
  });
}, {
  name: "app-redis-connector",
  fastify: "5.x",
});
