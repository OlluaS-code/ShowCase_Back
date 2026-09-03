import Ajv from "ajv";
import addFormats from "ajv-formats";

/**
 * Instanciação segura do compilador Ajv focada em compatibilidade e resiliência.
 * Configuração otimizada para integração com o TypeBox no Fastify.
 */
export const ajvInstance = new Ajv({
  coerceTypes: "array",    // Coerção segura (ex: transforma "123" em 123)
  useDefaults: true,       // Preenche propriedades ausentes com defaults
  removeAdditional: true,  // Remove propriedades extras que não estão no schema
  allErrors: true,         // Analisa todo o payload para gerar logs detalhados
});

// Nota: O pacote re2 tem problemas de build no Windows/ambientes cruzados.
// Em um ambiente cloud real, poderíamos plugar o re2. Aqui mantemos o engine padrão
// mas o TypeBox e Ajv já mitigarão a maior parte dos problemas limitando o input.

addFormats(ajvInstance);
