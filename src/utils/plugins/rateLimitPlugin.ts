import { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import fp from "fastify-plugin";

const rateLimitSetup = async (fastify: FastifyInstance) => {
  await fastify.register(rateLimit, {
    global: true, // Proteção base global
    max: 150,     // Limite padrão geral de 150 requisições por IP...
    timeWindow: 60000, // ...a cada janela de 1 minuto

    redis: fastify.redis,

    errorResponseBuilder: (request, context) => ({
      statusCode: 429,
      error: "Too Many Requests",
      message: `Taxa máxima de requisições atingida. Aguarde ${Math.ceil(context.ttl / 1000)} segundos para tentar novamente.`,
    }),
  });
};

export const rateLimitPlugin = fp(rateLimitSetup, {
  name: "app-rate-limit-protection",
  dependencies: ["app-redis-connector"], // Garante que o redis já foi conectado
});
