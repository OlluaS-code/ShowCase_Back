import { FastifyRequest, FastifyReply } from "fastify";
import { PubliService } from "../services/PubliService";
import { ProjectCategory } from "../../core/models/Enums";
import { createHash } from "crypto";
import { CacheXFetchService } from "../services/CacheXFetchService";

/** Instância do serviço XFetch com fator de agressividade padrão (β = 1.0) */
const cacheXFetch = new CacheXFetchService();

/** Chave de cache do feed — centralizada para invalidação consistente */
const FEED_CACHE_KEY = "showcase:feed:latest";

/** TTL lógico do cache do feed: 60 segundos (em ms) */
const FEED_CACHE_TTL_MS = 60_000;

export class PubliController {
  constructor(private publiService: PubliService) {}

  async handleCreate(request: FastifyRequest, reply: FastifyReply) {
    const pub = await this.publiService.createPublication(request.body as Record<string, unknown>);
    // Invalida cache de feed ao criar nova publicação
    await request.server.redis.del(FEED_CACHE_KEY).catch(() => {});
    return reply.status(201).send(pub);
  }

  async handleUpdate(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const pub = await this.publiService.updatePublication(id, request.body as Record<string, unknown>);
    await request.server.redis.del(FEED_CACHE_KEY).catch(() => {});
    return reply.send(pub);
  }

  async handleDelete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    await this.publiService.deletePublication(id);
    await request.server.redis.del(FEED_CACHE_KEY).catch(() => {});
    return reply.status(204).send();
  }

  /**
   * Feed público com proteção contra Cache Stampede via algoritmo XFetch.
   *
   * Em vez de um setex fixo que expira no segundo exato e causa uma
   * enxurrada de requisições ao PostgreSQL (Thundering Herd), o XFetch
   * recomputa o cache de forma probabilística e antecipada.
   *
   * Também inclui suporte a ETag para reduzir tráfego de rede:
   * se o cliente já possui a versão mais recente, retorna 304 Not Modified.
   */
  async handleGetFeed(request: FastifyRequest, reply: FastifyReply) {
    const redis = request.server.redis;

    let feedPayload: string;

    try {
      // XFetch: busca com proteção antecipada contra Cache Stampede
      const feedData = await cacheXFetch.getOrSet(
        redis,
        FEED_CACHE_KEY,
        FEED_CACHE_TTL_MS,
        async () => this.publiService.getGlobalFeed(),
      );
      feedPayload = JSON.stringify(feedData);
    } catch (err) {
      // Fallback: se Redis estiver indisponível, busca direto no Postgres
      request.log.error(err, "Falha no cache XFetch, buscando direto do PostgreSQL");
      try {
        const feed = await this.publiService.getGlobalFeed();
        feedPayload = JSON.stringify(feed);
      } catch {
        return reply.status(500).send({ error: "Erro ao carregar o feed." });
      }
    }

    // ETag para cache HTTP no lado do cliente (reduz tráfego de rede)
    const calculatedETag = `W/"${createHash("sha1").update(feedPayload).digest("hex")}"`;
    const clientETag = request.headers["if-none-match"];

    if (clientETag === calculatedETag) {
      return reply.status(304).send();
    }

    return reply
      .header("ETag", calculatedETag)
      .header("Cache-Control", "no-cache, must-revalidate")
      .send(JSON.parse(feedPayload));
  }

  async handleSearch(request: FastifyRequest, reply: FastifyReply) {
    const { category, title } = request.query as { category: string; title: string };

    if (!category || !title) {
      return reply
        .status(400)
        .send({ error: "Categoria e título são obrigatórios para a busca." });
    }

    const results = await this.publiService.searchInFolder(
      category as ProjectCategory,
      title,
    );

    if (results.length > 0) {
      return reply.send(results);
    }

    return reply.status(404).send({
      message: `Nenhuma publicação encontrada com o termo "${title}" na categoria "${category}".`,
    });
  }

  async handleTrending(request: FastifyRequest, reply: FastifyReply) {
    const trending = await this.publiService.getRankedPublications();
    return reply.send(trending);
  }
}
