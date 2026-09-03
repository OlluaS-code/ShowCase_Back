import { FastifyInstance } from "fastify";
import { PublicationEntity } from "../../database/migrations/publication.entity";
import { authMiddleware, adminGuard } from "../../utils/middlewares/AuthMiddleware";
import { InteractionController } from "../controller/InteractionController";
import { InteractionRepository } from "../repositories/InteractionRepository";
import { InteractionService } from "../services/InteractionService";
import { DataSource } from "typeorm";
import { UserEntity } from "../../database/migrations/user.entity";
import { NotificationService } from "../services/NotificationService";
import { NotificationRepository } from "../repositories/NotificationRepository";

export async function interactionRoutes(fastify: FastifyInstance) {
  const db = (fastify as any).db as DataSource;
  const interactionRepo = new InteractionRepository(db);
  const pubRepo = db.getRepository(PublicationEntity);
  const notifyRepo = new NotificationRepository(db);
  const notificationService = new NotificationService(notifyRepo);
  const userRepo = db.getRepository(UserEntity);

  const service = new InteractionService(
    userRepo,
    interactionRepo,
    pubRepo,
    notificationService,
  );
  const controller = new InteractionController(service);

  const baseSchema = {
    body: {
      type: "object",
      additionalProperties: false,
      required: ["publicationId"],
      properties: {
        publicationId: { type: "string", format: "uuid" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          action: { type: "string" },
          data: { type: "object", additionalProperties: true },
        },
      },
      201: {
        type: "object",
        properties: {
          action: { type: "string" },
          data: { type: "object", additionalProperties: true },
        },
      },
      429: {
        type: "object",
        properties: {
          action: { type: "string" },
          error: { type: "string" },
          message: { type: "string" }
        }
      }
    },
  };

  fastify.post(
    "/like",
    {
      schema: baseSchema,
      preHandler: [authMiddleware],
    },
    controller.handleLike.bind(controller),
  );
  fastify.post(
    "/share",
    {
      schema: baseSchema,
      preHandler: [authMiddleware],
    },
    controller.handleShare.bind(controller),
  );

  const auditSchema = {
    type: "array",
    items: {
      type: "object",
      properties: {
        id: { type: "string" },
        userId: { type: ["string", "null"] },
        publicationId: { type: "string" },
        type: { type: "string" },
        createdAt: { type: "string", format: "date-time" },
      },
      additionalProperties: true,
    },
  };

  fastify.get(
    "/audit/:userId",
    {
      preHandler: [adminGuard],
      schema: { response: { 200: auditSchema } },
    },
    controller.getAuditChronology.bind(controller)
  );

  fastify.get(
    "/audit/global",
    {
      preHandler: [adminGuard],
      schema: { response: { 200: auditSchema } },
    },
    controller.getGlobalAuditChronology.bind(controller)
  );
}
