import { FastifyInstance } from "fastify";
import { AppDataSource } from "../../utils/settings/data-source";
import { SpecificationEntity } from "../../database/migrations/specification.entity";
import { UserEntity } from "../../database/migrations/user.entity";
import { NotificationEntity } from "../../database/migrations/notification.entity";
import { NotificationRepository } from "../repositories/NotificationRepository";
import { NotificationService } from "../services/NotificationService";
import { SpecificationService } from "../services/SpecificationService";
import { SpecificationController } from "../controller/SpecificationController";
import { adminGuard } from "../../utils/middlewares/AuthMiddleware";

export async function specRoutes(fastify: FastifyInstance) {
  const specRepo = AppDataSource.getRepository(SpecificationEntity);
  const userRepo = AppDataSource.getRepository(UserEntity);
  const notificationRepository = new NotificationRepository(AppDataSource);
  const notificationService = new NotificationService(notificationRepository);
  
  const service = new SpecificationService(specRepo, userRepo, notificationService);
  const controller = new SpecificationController(service);

  // Rota Pública (Recupera todas as especialidades)
  fastify.get("/", controller.getAll.bind(controller));

  // Rotas Protegidas (Apenas Admin autenticado)
  fastify.post(
    "/",
    { preHandler: [adminGuard] },
    controller.create.bind(controller),
  );

  fastify.put(
    "/:id",
    { preHandler: [adminGuard] },
    controller.update.bind(controller),
  );

  fastify.delete(
    "/:id",
    { preHandler: [adminGuard] },
    controller.delete.bind(controller),
  );
}
