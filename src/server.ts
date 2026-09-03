import Fastify from "fastify";
import cors from "@fastify/cors";
import { redisPlugin } from "./utils/plugins/redisPlugin";
import { registerTypeBoxRollout } from "./utils/plugins/typebox-rollout.plugin";
import { registerGlobalErrorHandler } from "./utils/plugins/errorHandlerPlugin";
import { rateLimitPlugin } from "./utils/plugins/rateLimitPlugin";
import { config } from "./utils/settings/config";

const isProduction = config.NODE_ENV === "production";

const fastify = Fastify({
  logger: isProduction ? true : { transport: { target: "pino-pretty" } },
  trustProxy: true,
});

fastify.register(cors, {
  origin: ["http://localhost:5500", "http://127.0.0.1:5500", "http://localhost:3000", config.APP_FRONTEND_URL],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
});

import { securityPlugin } from "./utils/plugins/securityPlugin";
fastify.register(securityPlugin);

fastify.get(
  "/",
  {
    schema: { response: { 200: { type: "string" } } },
  },
  async () => "Server is running 🚀",
);

// FASE DE ROLLOUT: Alternar dryRun para 'false' quando os logs confirmarem 100% de conformidade
const isValidationDryRun = config.VALIDATION_DRY_RUN !== false;

// 1. Registra o Redis
fastify.register(redisPlugin);

// 2. Registra o gerenciador de validação com a flag de controle operacional
fastify.register(registerTypeBoxRollout, { dryRun: isValidationDryRun });

// 2.5 Registra o Rate Limit global
fastify.register(rateLimitPlugin);

// 3. Registra o tratador global de erros (substitui o antigo)
registerGlobalErrorHandler(fastify);

// Error handler centralizado implementado via plugin (registerGlobalErrorHandler)

export default fastify;
