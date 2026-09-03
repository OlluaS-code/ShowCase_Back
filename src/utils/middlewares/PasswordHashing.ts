import * as argon2 from "argon2";
import pLimit from "p-limit";

/**
 * Semáforo de concorrência: limita a 2 operações Argon2id simultâneas.
 * Matematicamente, 2 × 16MB = 32MB de teto máximo de RAM para hashing,
 * mantendo o servidor estável dentro dos 512MB do free tier.
 * Requisições excedentes aguardam na fila de forma não-bloqueante (Promise queue).
 */
const hashingSemaphore = pLimit(2);

/**
 * Parâmetros Argon2id calibrados para ambientes com RAM restrita (OWASP recomendado).
 * memoryCost: 16384 KiB (16MB) — reduzido de 65536 (64MB). Mantém resistência GPU/ASIC.
 * timeCost: 2 — mínimo OWASP. Ainda exige trabalho real de CPU para ataques offline.
 * parallelism: 1 — execução sequencial numa única thread da libuv, sem competição de cores.
 */
const ARGON2_OPTIONS: argon2.Options & { raw?: false } = {
  type: argon2.argon2id,
  memoryCost: 16384,
  timeCost: 2,
  parallelism: 1,
};

export class PasswordHashingService {
  /**
   * Gera hash Argon2id controlado pelo semáforo de concorrência.
   * Hashes gerados anteriormente com memoryCost=65536 continuam sendo
   * verificáveis pelo argon2.verify(), pois os parâmetros ficam embutidos
   * na própria string PHC ($argon2id$v=19$m=65536,...).
   */
  public static async hash(plainPassword: string): Promise<string> {
    return hashingSemaphore(() => argon2.hash(plainPassword, ARGON2_OPTIONS));
  }

  /**
   * Verifica a senha contra o hash existente no banco.
   * A biblioteca argon2 decodifica os parâmetros diretamente da string PHC,
   * portanto hashes antigos (64MB) são verificados corretamente com seus
   * parâmetros originais — sem migrações necessárias no banco de dados.
   * O semáforo protege contra picos de concorrência durante a verificação.
   */
  public static async verify(
    hash: string,
    plainPassword: string,
  ): Promise<boolean> {
    return hashingSemaphore(() => argon2.verify(hash, plainPassword));
  }
}
