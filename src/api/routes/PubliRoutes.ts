import { FastifyInstance } from "fastify";
import { UserEntity } from "../../database/migrations/user.entity";
import { PubliRepository } from "../repositories/PubliRepository";
import { PubliService } from "../services/PubliService";
import { DataSource } from "typeorm";
import { ProjectCategory } from "../../core/models/Enums";
import { adminGuard } from "../../utils/middlewares/AuthMiddleware";
import { NotificationRepository } from "../repositories/NotificationRepository";
import { NotificationService } from "../services/NotificationService";
import { PubliController } from "../controller/PubliController";
import { Type, Static } from "@sinclair/typebox";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";

export async function publiRoutes(fastifyApp: FastifyInstance) {
  // Usa o TypeProvider para tipar estritamente Request e Reply a partir do schema
  const fastify = fastifyApp.withTypeProvider<TypeBoxTypeProvider>();
  
  // O Redis agora é pego via request.server.redis no controller. 
  // Db access is below:
  const db = (fastify as unknown as { db: DataSource }).db;

  if (!db) {
    fastify.log.error(
      "Banco de dados não encontrado no Fastify! Verifique o plugin de conexão.",
    );
    return;
  }

  const notifyRepo = new NotificationRepository(db);
  const notificationService = new NotificationService(notifyRepo);

  const publiRepo = new PubliRepository(db);
  const userRepo = db.getRepository(UserEntity);

  const service = new PubliService(publiRepo, userRepo, notificationService);

  const controller = new PubliController(service);

  const publicationSchema = Type.Object({
    id: Type.String(),
    title: Type.String(),
    content: Type.String(),
    contentLength: Type.Optional(Type.Number()),
    category: Type.String(),
    media: Type.Optional(Type.Array(Type.Object({
      url: Type.String(),
      type: Type.String(),
    }))),
    techStack: Type.Optional(Type.Array(Type.String())),
    createdAt: Type.Optional(Type.String({ format: "date-time" })),
    interactions: Type.Optional(Type.Array(Type.Object({
      id: Type.String(),
      type: Type.String(),
      userId: Type.Union([Type.String(), Type.Null()]),
      publicationId: Type.String(),
      createdAt: Type.Optional(Type.String({ format: "date-time" })),
    }))),
  });

  const baseBodySchema = Type.Object({
    title: Type.String(),
    content: Type.String(),
    category: Type.Enum(ProjectCategory),
    media: Type.Array(
      Type.Object({
        url: Type.String(),
        type: Type.Union([Type.Literal("video"), Type.Literal("image")]),
      }),
      { maxItems: 3 }
    ),
    techStack: Type.Optional(Type.Array(Type.String())),
  }, { additionalProperties: false });

  fastify.post(
    "/",
    {
      preHandler: [adminGuard],
      schema: {
        body: baseBodySchema,
        response: { 201: publicationSchema },
      },
    },
    controller.handleCreate.bind(controller),
  );

  fastify.put(
    "/:id",
    {
      preHandler: [adminGuard],
      schema: {
        params: Type.Object({ id: Type.String() }),
        body: Type.Partial(baseBodySchema),
        response: { 200: publicationSchema },
      },
    },
    controller.handleUpdate.bind(controller),
  );

  fastify.delete(
    "/:id",
    {
      preHandler: [adminGuard],
      schema: {
        params: Type.Object({ id: Type.String() }),
        response: { 204: Type.Null() },
      },
    },
    controller.handleDelete.bind(controller),
  );

  fastify.get(
    "/feed",
    {
      schema: {
        response: { 200: Type.Array(publicationSchema) },
      },
    },
    controller.handleGetFeed.bind(controller),
  );

  fastify.get(
    "/search",
    {
      schema: {
        querystring: Type.Object({
          category: Type.Enum(ProjectCategory),
          title: Type.String(),
        }),
        response: { 200: Type.Array(publicationSchema) },
      },
    },
    controller.handleSearch.bind(controller),
  );

  fastify.get(
    "/trending",
    {
      schema: {
        response: { 200: Type.Array(publicationSchema) },
      },
    },
    controller.handleTrending.bind(controller),
  );
}

