import { FastifyInstance } from "fastify";
import { ApplicationException } from "../../core/error/http-exceptions";
import { PasswordError } from "../../core/error/password";
import { EmailError } from "../../core/error/email";

interface DatabaseDriverError extends Error {
  code?: string;
  detail?: string;
  table?: string;
}

/**
 * Manipulador Global de Erros (Error Handler Plugin).
 *
 * Intercepta exceções não tratadas em toda a aplicação.
 * Mapeia erros de domínio, infraestrutura e validação
 * para respostas HTTP padronizadas e seguras, evitando vazamento
 * de detalhes do banco de dados (Information Disclosure).
 */
export const registerGlobalErrorHandler = (fastify: FastifyInstance): void => {
  fastify.setErrorHandler((error: any, request, reply) => {
    const { log } = request;

    // 1. Exceções de Domínio (Business Logic)
    if (error instanceof ApplicationException) {
      return reply.status(error.statusCode).send({
        status: "error",
        code: error.statusCode,
        message: error.message,
      });
    }

    if (error instanceof PasswordError) {
      return reply.status(400).send({
        status: "Security Requirement",
        code: error.code,
        message: error.message,
      });
    }

    if (error instanceof EmailError) {
      return reply.status(400).send({
        status: "Validation Error",
        message: error.message,
      });
    }

    // 2. Erros de Validação (TypeBox / Ajv)
    if (error.validation) {
      log.warn(
        { url: request.url, validation: error.validation },
        "Falha de validação de input capturada"
      );
      
      return reply.status(400).send({
        status: "validation_error",
        code: 400,
        message: "Os dados fornecidos não atendem às regras de validação",
        errors: error.validation.map((err: any) => ({
          path: err.instancePath?.replace("/", "") || err.keyword,
          detail: err.message,
        })),
      });
    }

    // 3. Sanitização de erros nativos do driver PostgreSQL (SQLSTATE)
    const dbError = error as DatabaseDriverError;
    if (dbError.code && typeof dbError.code === "string") {
      log.error({
        msg: "Exceção crítica de banco de dados interceptada",
        dbCode: dbError.code,
        dbDetail: dbError.detail,
        dbTable: dbError.table,
        stack: error.stack,
      });

      switch (dbError.code) {
        case "23505": // unique_violation
          return reply.status(409).send({
            status: "conflict",
            code: 409,
            message: "Inconsistência nos dados enviados: o registro já existe",
          });
        case "23503": // foreign_key_violation
          return reply.status(400).send({
            status: "bad_request",
            code: 400,
            message: "O registro referenciado em sua requisição é inválido ou inexistente",
          });
        case "08000": // connection_exception
        case "08006": // connection_failure
          return reply.status(503).send({
            status: "service_unavailable",
            code: 503,
            message: "Serviço de persistência temporariamente indisponível",
          });
        default:
          return reply.status(500).send({
            status: "internal_error",
            code: 500,
            message: "Erro interno no processamento de dados persistentes",
          });
      }
    }

    // 4. Erros HTTP padrão (ex: 429 Too Many Requests do fastify-rate-limit)
    if (error.statusCode && typeof error.statusCode === "number") {
      log.warn(
        { err: { message: error.message, statusCode: error.statusCode } },
        "Erro HTTP capturado pelo manipulador global"
      );
      
      return reply.status(error.statusCode).send({
        status: error.statusCode === 429 ? "too_many_requests" : "error",
        code: error.statusCode,
        message: error.message,
      });
    }

    // 5. Fallback: Erros fatais / desconhecidos
    log.fatal(
      { err: { message: error.message, stack: error.stack } },
      "Exceção fatal capturada pelo manipulador global"
    );

    return reply.status(500).send({
      status: "fatal_server_error",
      code: 500,
      message: "Falha crítica interna do servidor",
    });
  });
};
