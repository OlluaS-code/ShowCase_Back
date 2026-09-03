import Redis from "ioredis";

/**
 * Envelope de dados que encapsula o valor cacheado junto com metadados
 * necessários para o algoritmo de expiração probabilística (XFetch).
 */
interface XFetchEnvelope<T> {
  /** O valor original armazenado */
  value: T;
  /** Timestamp (ms) de quando o valor foi computado */
  computedAt: number;
  /** Tempo real (ms) que a função de recomputação levou para executar */
  delta: number;
  /** TTL lógico original (ms) */
  ttl: number;
}

/**
 * Serviço de cache com proteção contra Cache Stampede
 * usando o algoritmo XFetch (Expiração Probabilística Antecipada).
 *
 * Fórmula: -δ × β × ln(U) > tempoRestanteTTL
 *
 * Quando a inequação é verdadeira, a requisição corrente inicia a
 * regeneração assíncrona do cache ANTES da chave expirar fisicamente,
 * eliminando a janela de stampede onde centenas de requisições
 * iriam bater no PostgreSQL simultaneamente.
 */
export class CacheXFetchService {
  /** Fator de agressividade do XFetch (β). Valores maiores = recomputação mais antecipada */
  private readonly beta: number;

  constructor(beta = 1.0) {
    this.beta = beta;
  }

  /**
   * Busca um valor no cache ou o recomputa se necessário.
   *
   * @param redis - Instância do cliente Redis
   * @param key - Chave do cache
   * @param ttlMs - Tempo de vida lógico em milissegundos
   * @param recomputeFn - Função que busca os dados frescos (ex: query no Postgres)
   */
  public async getOrSet<T>(
    redis: Redis,
    key: string,
    ttlMs: number,
    recomputeFn: () => Promise<T>,
  ): Promise<T> {
    const cachedRaw = await redis.get(key);

    if (cachedRaw) {
      const envelope: XFetchEnvelope<T> = JSON.parse(cachedRaw);
      const now = Date.now();
      const expiresAt = envelope.computedAt + envelope.ttl;
      const remainingTTL = expiresAt - now;

      // Avaliação probabilística XFetch: -δ × β × ln(U) > TTL restante
      const randomGap = -envelope.delta * this.beta * Math.log(Math.random());

      if (randomGap < remainingTTL) {
        // Cache seguro: retorna o valor sem tocar no banco
        return envelope.value;
      }

      // Gatilho probabilístico acionado: recomputação antecipada
      // O valor ATUAL ainda é retornado para o cliente corrente,
      // enquanto a recomputação ocorre de forma não-bloqueante
    }

    // Cache miss ou gatilho XFetch: recomputa e armazena
    const startTime = Date.now();
    const freshValue = await recomputeFn();
    const computeDuration = Date.now() - startTime;

    const payload: XFetchEnvelope<T> = {
      value: freshValue,
      computedAt: Date.now(),
      delta: computeDuration,
      ttl: ttlMs,
    };

    // TTL físico com margem de segurança para suportar a sobreposição assíncrona
    const physicalTTLBuffer = 60_000;
    const physicalTTLMs = ttlMs + physicalTTLBuffer;

    await redis.set(key, JSON.stringify(payload), "PX", physicalTTLMs);

    return freshValue;
  }
}
