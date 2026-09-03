import { FastifyInstance } from "fastify";
import { UserRepository } from "../repositories/UserRepository";
import { UserService } from "../services/UserService";
import { UserController } from "../controller/UserController";
import { UserRole } from "../../core/models/Enums";
import { UserDeletionStrategy } from "../../core/security/strategies/UserDeletionStrategy";
import { authMiddleware, adminGuard } from "../../utils/middlewares/AuthMiddleware";

const userDeletionStrategy = new UserDeletionStrategy();

export async function userRoutes(fastify: FastifyInstance) {
  const userRepository = new UserRepository();
  const userService = new UserService(userRepository, fastify.redis);
  const userController = new UserController(userService);

  const userSchema = {
    type: "object",
    properties: {
      id: { type: "string" },
      name: { type: "string" },
      email: { type: "string" },
      role: { type: "string", enum: Object.values(UserRole) },
      status: { type: "string" },
      passwordStrength: { type: "string" },
    },
  };

  fastify.get(
    "/",
    {
      preHandler: [adminGuard],
      schema: {
        response: {
          200: {
            type: "array",
            items: userSchema,
          },
        },
      },
    },
    userController.getAll.bind(userController)
  );

  fastify.post(
    "/register",
    {
      config: {
        rateLimit: {
          max: 5, // Limite restrito: apenas 5 cadastros por IP...
          timeWindow: 60000 * 5, // ...a cada janela de 5 minutos
        }
      },
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["name", "email", "passwordPlain"],
          properties: {
            name: { type: "string" },
            email: { type: "string", format: "email" },
            passwordPlain: { type: "string", minLength: 6 },
          },
        },
        response: { 201: userSchema },
      },
    },
    userController.register.bind(userController),
  );

  fastify.post(
    "/login",
    {
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["email", "passwordPlain"],
          properties: {
            email: { type: "string", format: "email" },
            passwordPlain: { type: "string" },
            secureLoginToken: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              user: userSchema,
              accessToken: { type: "string" },
              refreshToken: { type: "string" },
            },
          },
        },
      },
    },
    userController.login.bind(userController),
  );

  fastify.delete(
    "/:id",
    {
      preHandler: [authMiddleware, fastify.guard(userDeletionStrategy)],
      schema: {
        params: { type: "object", properties: { id: { type: "string" } } },
        response: { 204: { type: "null" } },
      },
    },
    userController.delete.bind(userController),
  );

  fastify.post(
    "/:id/suspend",
    {
      preHandler: [authMiddleware],
      schema: {
        params: { type: "object", properties: { id: { type: "string" } } },
        body: {
          type: "object",
          properties: {
            tokenSignature: { type: "string" },
            tokenExpiryTimestamp: { type: "number" }
          }
        },
        response: { 200: { type: "object", properties: { message: { type: "string" } } } },
      },
    },
    userController.suspend.bind(userController),
  );
}
