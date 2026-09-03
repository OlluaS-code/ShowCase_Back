import { describe, it, expect } from 'vitest';
import { PasswordHashingService } from '../../src/utils/middlewares/PasswordHashing';

describe('PasswordHashingService - Unit Tests', () => {
  const plainPassword = 'MySuperSecretPassword123!';

  it('deve gerar um hash no formato Argon2id', async () => {
    const hash = await PasswordHashingService.hash(plainPassword);
    
    // O formato padrão do Argon2 começa com $argon2id$v=19$m=...
    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
    expect(hash.startsWith('$argon2id$v=19$m=16384,t=2,p=1$')).toBe(true);
  });

  it('deve retornar true ao verificar a senha correta', async () => {
    const hash = await PasswordHashingService.hash(plainPassword);
    
    const isValid = await PasswordHashingService.verify(hash, plainPassword);
    expect(isValid).toBe(true);
  });

  it('deve retornar false ao verificar a senha incorreta', async () => {
    const hash = await PasswordHashingService.hash(plainPassword);
    
    const isValid = await PasswordHashingService.verify(hash, 'WrongPassword123!');
    expect(isValid).toBe(false);
  });

  it('deve suportar múltiplas requisições limitadas pelo semáforo de concorrência', async () => {
    // Dispara 5 requisições de hash simultâneas (o p-limit restringirá a 2 por vez na camada inferior)
    const promises = Array.from({ length: 5 }).map((_, index) => 
      PasswordHashingService.hash(`PassWord_${index}`)
    );

    const hashes = await Promise.all(promises);
    
    expect(hashes.length).toBe(5);
    hashes.forEach(hash => {
      expect(hash.startsWith('$argon2id$')).toBe(true);
    });
  });
});
