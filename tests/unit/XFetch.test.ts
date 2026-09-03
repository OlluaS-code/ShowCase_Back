import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

interface CacheMetadata {
  delta: number;
  expiresAt: number;
}

export function checkXFetchExpiration(
  metadata: CacheMetadata,
  beta: number,
  randomValue: number,
  currentTime: number
): boolean {
  if (currentTime >= metadata.expiresAt) {
    return true;
  }

  const probabilisticThreshold = -beta * metadata.delta * Math.log(randomValue);
  const remainingTime = metadata.expiresAt - currentTime;

  return probabilisticThreshold > remainingTime;
}

describe('Determinismo Matemático - Algoritmo XFetch', () => {
  const mockDelta = 100;
  const baseTtl = 10000;
  let mockCurrentTime: number;

  beforeEach(() => {
    vi.useFakeTimers();
    mockCurrentTime = Date.now();
    vi.setSystemTime(mockCurrentTime);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('deve indicar que o cache está válido quando distante da expiração e com Delta próximo de 1', () => {
    const metadata: CacheMetadata = {
      delta: mockDelta,
      expiresAt: mockCurrentTime + baseTtl,
    };
    const randomDelta = 0.99;
    const beta = 1;

    const shouldRecompute = checkXFetchExpiration(metadata, beta, randomDelta, mockCurrentTime);
    expect(shouldRecompute).toBe(false);
  });

  it('deve forçar a recomputação antecipada de forma probabilística', () => {
    const elapsed = baseTtl - 1500;
    const evaluationTime = mockCurrentTime + elapsed;

    const metadata: CacheMetadata = {
      delta: mockDelta,
      expiresAt: mockCurrentTime + baseTtl,
    };
    
    const randomDelta = 0.01;
    const beta = 5;

    const shouldRecompute = checkXFetchExpiration(metadata, beta, randomDelta, evaluationTime);
    expect(shouldRecompute).toBe(true);
  });

  it('deve retornar verdadeiro incontornavelmente se o TTL for ultrapassado', () => {
    const expiredTime = mockCurrentTime + baseTtl + 1;
    const metadata: CacheMetadata = {
      delta: mockDelta,
      expiresAt: mockCurrentTime + baseTtl,
    };
    const randomDelta = 0.999;
    const beta = 0;

    const shouldRecompute = checkXFetchExpiration(metadata, beta, randomDelta, expiredTime);
    expect(shouldRecompute).toBe(true);
  });
});
