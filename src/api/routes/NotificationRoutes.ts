import { FastifyInstance } from "fastify";
import fastifySse from "@fastify/sse";
import { authMiddleware } from "../../utils/middlewares/AuthMiddleware";
import { DataSource } from "typeorm";
import { NotificationRepository } from "../repositories/NotificationRepository";
import { NotificationService } from "../services/NotificationService";
import { NotificationController } from "../controller/NotificationController";

export async function notificationRoutes(fastify: FastifyInstance) {
  fastify.register(fastifySse);

  const db = (fastify as any).db as DataSource;
  const repo = new NotificationRepository(db);
  const service = new NotificationService(repo);
  const controller = new NotificationController(service);

  fastify.get("/live", { preHandler: [authMiddleware] }, controller.live.bind(controller));

  const notificationSchema = {
    type: "object",
    properties: {
      id: { type: "string" },
      type: { type: "string" },
      message: { type: "string" },
      read: { type: "boolean" },
      data: { type: "object", additionalProperties: true },
      createdAt: { type: "string", format: "date-time" },

      sender: {
        type: "object",
        nullable: true,
        properties: { name: { type: "string" } },
      },
    },
  };

  fastify.get(
    "/",
    {
      preHandler: [authMiddleware],
      schema: {
        response: { 200: { type: "array", items: notificationSchema } },
      },
    },
    controller.list.bind(controller),
  );

  fastify.patch(
    "/read",
    {
      preHandler: [authMiddleware],
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["ids"],
          properties: {
            ids: { type: "array", items: { type: "string", format: "uuid" } },
          },
        },
        response: { 204: { type: "null" } },
      },
    },
    controller.read.bind(controller),
  );

  fastify.delete(
    "/:id",
    {
      preHandler: [authMiddleware],
      schema: {
        params: {
          type: "object",
          properties: { id: { type: "string" } },
        },
        response: { 204: { type: "null" } },
      },
    },
    controller.delete.bind(controller),
  );
}
