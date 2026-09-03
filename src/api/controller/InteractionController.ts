import { FastifyReply, FastifyRequest } from "fastify";
import { InteractionService } from "../services/InteractionService";

export class InteractionController {
  constructor(private service: InteractionService) {}

  async handleLike(req: FastifyRequest, reply: FastifyReply) {
    const { publicationId } = req.body as { publicationId: string };
    const userId = req.user?.id as string;
    const { redis } = req.server;

    // Mutex Lock via Redis (Evita concorrência e race conditions)
    const lockKey = `lock:like:${userId}:${publicationId}`;
    const acquired = await redis.set(lockKey, "locked", "PX", 2000, "NX");

    if (!acquired) {
      return reply.status(429).send({
        action: "blocked",
        error: "Too Many Requests",
        message: "Aguarde um momento para realizar esta ação novamente."
      });
    }

    try {
      const result = await this.service.toggleLike(userId, publicationId);
      // Invalida o cache do feed para refletir o novo like
      await redis.del("showcase:feed:latest").catch(() => {});
      return reply.status(200).send(result);
    } finally {
      await redis.del(lockKey);
    }
  }

  async handleShare(req: FastifyRequest, reply: FastifyReply) {
    const { publicationId } = req.body as { publicationId: string };
    const { redis } = req.server;
    const result = await this.service.share(
      req.user?.id as string,
      publicationId,
    );
    // Invalida o cache do feed para refletir o novo share
    await redis.del("showcase:feed:latest").catch(() => {});
    return reply.status(201).send(result);
  }

  async getAuditChronology(req: FastifyRequest, reply: FastifyReply) {
    const { userId } = req.params as { userId: string };
    const chronology = await this.service.getAuditChronology(userId);
    return reply.status(200).send(chronology);
  }

  async getGlobalAuditChronology(req: FastifyRequest, reply: FastifyReply) {
    const chronology = await this.service.getGlobalAuditChronology();
    return reply.status(200).send(chronology);
  }
}
