/// <reference types="node" />
import "reflect-metadata";
import * as crypto from "node:crypto";
import * as argon2 from "argon2";
import * as readline from "node:readline";
import { AppDataSource } from "../src/utils/settings/data-source";
import { config } from "../src/utils/settings/config";
import {
  UserEntity,
  AdminUserEntity,
} from "../src/database/migrations/user.entity";

const COMPLEX_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()_+-=[]{}|;:,.<>?";

function generateSecurePassword(length: number = 32): string {
  let result = "";
  const alphabetLength = COMPLEX_ALPHABET.length;

  while (result.length < length) {
    const randomBytes = crypto.randomBytes(1);
    const randomValue = randomBytes[0];

    if (randomValue < 256 - (256 % alphabetLength)) {
      result += COMPLEX_ALPHABET[randomValue % alphabetLength];
    }
  }
  return result;
}

async function clearTerminalLine(linesToClear: number = 5): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  for (let i = 0; i < linesToClear; i++) {
    process.stdout.write("\x1b[1A");
    process.stdout.write("\x1b[2K");
  }

  const junk = Array(80)
    .fill("01X?#@!*")
    .map((x) => x[Math.floor(Math.random() * x.length)])
    .join("");
  process.stdout.write(`\r[DESTRUCTION BUFFER] ${junk}\n`);

  await new Promise((resolve) => setTimeout(resolve, 300));
  process.stdout.write(
    "\x1b[1A\x1b[2K\rSessão encerrada com segurança. Nenhuns dados persistiram no buffer do terminal.\n",
  );
  rl.close();
}

async function bootstrapAdmin() {
  console.log("=== SISTEMA DE PROVISIONAMENTO DE ADMIN DE ELITE ===\n");

  const email = config.ADMIN_EMAIL;
  const plainPassword = config.ADMIN_PASSWORD;

  if (!email || !plainPassword) {
    console.error("[-] ERRO: Variáveis ADMIN_EMAIL e ADMIN_PASSWORD não estão definidas no .env (ou via config.ts)!");
    process.exit(1);
  }

  const passwordHash = await argon2.hash(plainPassword, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  console.log("[+] Conectando à Base de Dados PostgreSQL via TypeORM...");
  await AppDataSource.initialize();
  const userRepository = AppDataSource.getRepository(UserEntity);

  const existingUser = await userRepository.findOne({ where: { email } });
  if (existingUser) {
    console.log(
      `[!] Utilizador ${email} já existe. Atualizando a senha e elevando permissões para ADMIN...`,
    );
    existingUser.passwordHash = passwordHash;
    existingUser.role = "ADMIN" as any; // Força a troca do discriminador na tabela
    await userRepository.save(existingUser);
  } else {
    // Creating the Admin User using the ChildEntity
    const adminUser = new AdminUserEntity("Saullo Moura", email, passwordHash);
    await userRepository.save(adminUser);
  }

  console.log("[+] Operação concluída com sucesso na Base de Dados.");
  console.log(
    "\n=================== ATENÇÃO: SENHA GERADA ===================",
  );
  console.log(`Email: ${email}`);
  console.log(`Senha: ${plainPassword}`);
  console.log("=============================================================");
  console.log("Esta senha será destruída visualmente do ecrã em 15 segundos.");
  console.log(
    "Copie-a imediatamente para o seu gestor de credenciais offline.",
  );

  for (let delay = 15; delay > 0; delay--) {
    process.stdout.write(
      `\rTempo restante: ${delay}s... (Pressione CTRL+C se já guardou)`,
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  await clearTerminalLine(8);
  await AppDataSource.destroy();
  process.exit(0);
}

bootstrapAdmin().catch((err) => {
  console.error("[-] Erro fatal no provisionamento:", err);
  process.exit(1);
});
