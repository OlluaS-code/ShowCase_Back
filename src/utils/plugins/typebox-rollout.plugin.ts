import { FastifyInstance, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { ajvInstance } from "../settings/ajv-compiler";

export interface RolloutOptions {
  dryRun: boolean; // Se true, apenas loga os erros e deixa a requisição passar
}

const typeBoxRolloutPlugin: FastifyPluginAsync<RolloutOptions> = async (
  fastify: FastifyInstance,
  options,
) => {
  const isDryRun = options.dryRun ?? true;

  // Substitui o compilador padrão de validação do Fastify por um wrapper tolerante
  fastify.setValidatorCompiler(({ schema, method, url, httpPart }) => {
    const validate = ajvInstance.compile(schema);

    return (data) => {
      const isValid = validate(data);

      if (!isValid) {
        if (isDryRun) {
          // EM MODO DRY-RUN: Loga o desvio, mas valida o payload para passar
          fastify.log.warn({
            msg: "FALLBACK_VAL_DRY_RUN: Inconsistência de payload capturada",
            route: `${method} ${url}`,
            part: httpPart,
            errors: validate.errors,
            receivedPayload: data,
          });

          // Retorna sucesso para o Fastify prosseguir com a execução do Controller
          return true;
        }

        // EM MODO ESTRITO: Propaga os erros para o manipulador global retornar 400
        return { error: validate.errors as any };
      }

      return true;
    };
  });
};

export const registerTypeBoxRollout = fp(typeBoxRolloutPlugin, {
  name: "typebox-rollout-validator",
  fastify: "5.x",
});
