import { FastifyInstance } from "fastify";
import { TokenService } from "../../utils/middlewares/TokenService";
import { config } from "../../utils/settings/config";

export async function adminRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/admin/verify/:hash
   * Valida o acesso à rota administrativa através da hash fixa carregada do .env.
   */
  fastify.get<{ Params: { hash: string } }>(
    "/verify/:hash",
    async (request, reply) => {
      const { hash } = request.params;
      const expectedHash = config.ADMIN_PANEL_HASH;

      if (hash !== expectedHash) {
        return reply.status(401).send({ error: "Unauthorized access" });
      }

      const secureLoginToken = TokenService.generateAdminBarrierToken();
      return reply.send({ success: true, message: "Valid Static Route", secureLoginToken });
    }
  );
}
