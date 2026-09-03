import "fastify";
import { AppConfig } from "../utils/settings/config";
import { UserRole } from "../core/models/Enums";
import type Redis from "ioredis";
import type { SignedAdminURL } from "../api/hooks/admin-signature.hook";

declare module "fastify" {
  interface FastifyInstance {
    config: AppConfig;
    /** Cliente Redis centralizado injetado pelo redisPlugin */
    redis: Redis;
  }

  interface FastifyRequest {
    user?: {
      id: string;
      role: UserRole;
      permissions: string[];
      /** Escopos de privilégio injetados pelo AdminGuard (ex: "admin:access") */
      scopes: string[];
      jti?: string;
    };
    /** URL administrativa verificada pelo hook HMAC (admin-signature.hook) */
    verifiedAdminUrl?: SignedAdminURL;
  }
}

// Força o TypeScript a tratar este arquivo como módulo isolado,
// garantindo a mesclagem correta de interfaces (declaration merging)
// em vez de substituição destrutiva das tipagens originais do Fastify.
export {};
