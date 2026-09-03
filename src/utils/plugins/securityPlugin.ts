import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { AuthorizationStrategy, ResourceContext } from "../../core/security/AuthorizationStrategy";

declare module "fastify" {
  interface FastifyInstance {
    guard(strategy: AuthorizationStrategy): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export const securityPlugin = fp(async (fastify: FastifyInstance) => {
  fastify.decorate("guard", (strategy: AuthorizationStrategy) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      // O usuário já foi autenticado e o payload do JWT injetado em request.user via authMiddleware
      const user = request.user;
      
      if (!user) {
        reply.status(401).send({ error: "Falha de Autenticação: Utilizador não identificado." });
        return;
      }

      const context: ResourceContext = {
        userId: user.id,
        role: user.role,
        resourceId: (request.params as { id?: string })?.id
      };

      const authorized = await strategy.isAuthorized(context);

      if (!authorized) {
        reply.status(403).send({ error: "Acesso Proibido: Privilégios insuficientes para esta operação." });
        return;
      }
    };
  });
});
