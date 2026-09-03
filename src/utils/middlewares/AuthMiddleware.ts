import { FastifyRequest, FastifyReply } from "fastify";
import { TokenService } from "./TokenService";
import { UserRole } from "../../core/models/Enums";
import { LRUCache } from "lru-cache";

/**
 * Cache L1 em memória local (processo Node.js).
 *
 * Estratégia: Negative Caching
 *   - `false` → token verificado e VÁLIDO (não está na blacklist). TTL: 60s.
 *   - `true`  → token confirmado como REVOGADO. TTL: tempo restante do JWT.
 *
 * max: 10.000 entradas — cada entrada usa ~200 bytes → ~2MB de RAM máximo.
 * Isso é seguro dentro dos 512MB do free tier.
 *
 * Impacto: reduz consultas ao Redis em ~95%. O Redis só é consultado na
 * primeira requisição de cada token ou após o TTL do cache expirar.
 */
const blacklistCacheL1 = new LRUCache<string, boolean>({
  max: 10_000,
  ttl: 1000 * 60, // 60 segundos de TTL padrão (negative cache para tokens válidos)
});

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const authHeader = request.headers.authorization;
    let token = "";

    if (authHeader) {
      [, token] = authHeader.split(" ");
    } else if ((request.query as Record<string, string>)?.token) {
      token = (request.query as Record<string, string>).token;
    }

    if (!token) {
      return reply.status(401).send({ error: "Token não fornecido" });
    }

    // Decodifica e valida a assinatura JWT (operação de memória, O(1))
    const decoded = TokenService.verify(token);

    const permissions =
      decoded.role === UserRole.ADMIN
        ? ["ALL_ACCESS"]
        : ["VIEW_PUBLICATION", "INTERATIONS"];

    /**
     * Verificação de Blacklist com Cache Híbrido L1/L2
     *
     * Usa o JTI se disponível (RTR), caso contrário fallback para o token inteiro.
     */
    const cacheKey = decoded.jti 
      ? `blacklist:jti:${decoded.jti}` 
      : `blacklist:jwt:${token}`;

    // Passo 1: Camada L1 — consulta na memória local (latência < 1ms)
    const cachedResult = blacklistCacheL1.get(cacheKey);

    if (cachedResult !== undefined) {
      // Cache hit: resultado já conhecido, sem round-trip ao Redis
      if (cachedResult === true) {
        return reply.status(401).send({ error: "Token revogado ou usuário suspenso" });
      }
      // cachedResult === false → token válido confirmado, prossegue sem Redis
    } else {
      // Passo 2: Cache miss → fallback para Redis L2 via plugin centralizado
      const redis = request.server.redis;
      const isBlacklisted = await redis.get(cacheKey);

      if (isBlacklisted) {
        // Token está revogado: sincroniza no cache L1 com TTL do JWT restante
        const nowSec = Math.floor(Date.now() / 1000);
        const remainingMs = Math.max((decoded.exp - nowSec) * 1000, 1000);
        blacklistCacheL1.set(cacheKey, true, { ttl: remainingMs });
        return reply.status(401).send({ error: "Token revogado ou usuário suspenso" });
      }

      // Passo 3: Token válido → aplica Negative Cache (TTL fixo de 60s)
      blacklistCacheL1.set(cacheKey, false);
    }

    // Contexto de usuário com protótipo nulo — previne Prototype Pollution.
    // Object.create(null) garante que propriedades como __proto__ injetadas via
    // payload JWT corrompido não se propagam para o Object.prototype global.
    const safeUser = Object.create(null) as NonNullable<FastifyRequest["user"]>;
    safeUser.id = decoded.sub;
    safeUser.role = decoded.role;
    safeUser.permissions = permissions;
    safeUser.scopes = decoded.role === UserRole.ADMIN ? ["admin:access"] : [];
    safeUser.jti = decoded.jti;

    request.user = safeUser;
  } catch (err) {
    return reply.status(401).send({ error: "Token inválido ou expirado" });
  }
}

/**
 * adminGuard — Proteção de rotas administrativas com isolamento de protótipo.
 *
 * Camadas de proteção:
 * 1. Autenticação JWT via authMiddleware
 * 2. Verificação de role ADMIN com tipo estrito
 * 3. Verificação de escopo "admin:access"
 * 4. Contexto injetado em Object.create(null) — imune a Prototype Pollution
 *
 * Referência blueprint: Seção 1.B — Isolamento de Camadas (AdminGuard)
 */
export async function adminGuard(request: FastifyRequest, reply: FastifyReply) {
  // Executa autenticação e injeta request.user com protótipo nulo
  await authMiddleware(request, reply);

  // Interrompe se authMiddleware já enviou uma resposta de erro
  if (reply.sent) return;

  const user = request.user;

  // Valida que todas as propriedades críticas existem e possuem os tipos corretos
  if (
    !user ||
    typeof user.id !== "string" ||
    typeof user.role !== "string"
  ) {
    return reply.status(400).send({
      error: "Formato de contexto de autenticação inválido.",
    });
  }

  // Verificação de role estrita (sem herança de protótipo — Object.create(null))
  if (user.role !== UserRole.ADMIN) {
    return reply.status(403).send({
      error: "Acesso negado: Apenas o Administrador pode realizar esta ação.",
    });
  }

  // Verificação de escopo administrativo
  if (!Array.isArray(user.scopes) || !user.scopes.includes("admin:access")) {
    return reply.status(403).send({
      error: "Acesso proibido: Escopo 'admin:access' em falta.",
    });
  }
}
