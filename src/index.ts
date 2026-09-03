import "reflect-metadata";
import "@dotenvx/dotenvx";
import { config } from "./utils/settings/config";
import { AppDataSource } from "./utils/settings/data-source";
import fastify from "./server";
import { userRoutes } from "./api/routes/UserRoutes";
import { publiRoutes } from "./api/routes/PubliRoutes";
import { interactionRoutes } from "./api/routes/InteractionRoutes";
import { notificationRoutes } from "./api/routes/NotificationRoutes";
import { adminRoutes } from "./api/routes/AdminRoutes";
import { specRoutes } from "./api/routes/SpecRoutes";

async function bootstrap() {
  try {
    fastify.log.info("Connecting to database...");
    await AppDataSource.initialize();
    fastify.log.info("🚀 Banco de dados conectado com sucesso!");

    fastify.decorate("db", AppDataSource);

    fastify.register(userRoutes, { prefix: "/api/users" });
    fastify.register(publiRoutes, { prefix: "/api/publications" });
    fastify.register(interactionRoutes, { prefix: "/api/interactions" });
    fastify.register(notificationRoutes, { prefix: "/api/notifications" });
    fastify.register(adminRoutes, { prefix: "/api/admin" });
    fastify.register(specRoutes, { prefix: "/api/specifications" });

    const address = await fastify.listen({
      port: config.PORT,
      host: "0.0.0.0",
    });

    fastify.log.info(
      `Server listening on ✅ ${address} // ${config.NODE_ENV}.`,
    );

    // Graceful Shutdown
    const shutdown = async (signal: string) => {
      fastify.log.info(`Recebido ${signal}. Iniciando graceful shutdown...`);
      await fastify.close();
      await AppDataSource.destroy();
      fastify.log.info('Conexões encerradas com segurança.');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    fastify.log.error("❌ Erro durante o bootstrap:");
    fastify.log.error(error);
    process.exit(1);
  }
}

bootstrap();
