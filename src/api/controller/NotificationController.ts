import { FastifyReply, FastifyRequest } from "fastify";
import { NotificationService, NotificationEmitter } from "../services/NotificationService";
import Redis from "ioredis";

export class NotificationController {
  constructor(private service: NotificationService) {}

  /**
   * SSE de notificações em tempo real.
   * Implementa mitigação de vazamento de memória e backpressure.
   */
  async live(req: FastifyRequest, reply: FastifyReply) {
    const userId = req.user?.id;
    if (!userId) {
      return reply.status(401).send({ message: "Unauthorized" });
    }
    const clientId = `sse_client:${req.id}`;
    const { log } = req;

    // Preserva os headers do Fastify (como o CORS) usando reply.getHeaders()
    reply.header("Content-Type", "text/event-stream");
    reply.header("Cache-Control", "no-cache, no-transform");
    reply.header("Connection", "keep-alive");
    reply.header("X-Accel-Buffering", "no"); // Impede buffering agressivo do Nginx
    
    reply.raw.writeHead(200, reply.getHeaders() as any);

    reply.raw.write(`event: welcome\ndata: ${JSON.stringify({ clientId })}\n\n`);

    const listener = (notification: unknown) => {
      // Verifica vazão física do socket (Backpressure)
      const success = reply.raw.write(
        `event: notification\ndata: ${JSON.stringify(notification)}\n\n`
      );
      if (!success) {
        log.warn({ clientId }, "SSE: Soquete saturado (Backpressure ativo)");
      }
    };

    NotificationEmitter.on(`user:${userId}`, listener);

    // Batimento cardíaco periódico (heartbeat) silencioso para manter conexão
    const heartbeatTimer = setInterval(() => {
      if (!reply.raw.destroyed) {
        reply.raw.write(":keepalive-heartbeat\n\n");
      }
    }, 15000);

    const executeCleanup = () => {
      log.info({ clientId }, "SSE: Desconexão capturada. Liberando recursos.");
      clearInterval(heartbeatTimer);
      NotificationEmitter.removeListener(`user:${userId}`, listener);
      if (!reply.raw.destroyed) {
        reply.raw.end();
      }
    };

    req.raw.on("close", executeCleanup);
    req.raw.on("error", (err) => {
      log.error({ err, clientId }, "SSE: Erro na conexão do cliente");
      executeCleanup();
    });

    // Mantém a conexão aberta pelo Fastify
    return reply as unknown as Promise<void>;
  }

  async list(req: FastifyRequest, reply: FastifyReply) {
    const userId = req.user?.id;
    if (!userId) return reply.status(401).send({ message: "Unauthorized" });

    const notifications = await this.service.getUserNotifications(userId);
    return reply.send(notifications);
  }

  async read(req: FastifyRequest, reply: FastifyReply) {
    const userId = req.user?.id;
    if (!userId) return reply.status(401).send({ message: "Unauthorized" });

    const { ids } = req.body as { ids: string[] };

    if (!ids || ids.length === 0)
      return reply.status(400).send({ message: "No IDs provided" });

    await this.service.readNotifications(userId, ids);
    return reply.status(204).send();
  }

  async delete(req: FastifyRequest, reply: FastifyReply) {
    const userId = req.user?.id;
    if (!userId) return reply.status(401).send({ message: "Unauthorized" });

    const { id } = req.params as { id: string };
    await this.service.deleteNotification(userId, id);
    return reply.status(204).send();
  }
}
