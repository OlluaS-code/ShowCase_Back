import { UserRepository } from "../repositories/UserRepository";
import { PasswordHashingService } from "../../utils/middlewares/PasswordHashing";
import { TokenService } from "../../utils/middlewares/TokenService";
import {
  UserEntity,
  AdminUserEntity,
  VisitorUserEntity,
} from "../../database/migrations/user.entity";
import { RegisterDTO, LoginDTO } from "../../core/models/User";
import { UserRole } from "../../core/models/Enums";
import { EmailService } from "../../core/email/email";

import crypto from "crypto";
import Redis from "ioredis";

export class UserService {
  constructor(
    private userRepository: UserRepository,
    private redis: Redis
  ) {}

  public async register(data: RegisterDTO): Promise<UserEntity> {
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new Error("Usuário com este e-mail já existe.");
    }

    const hashedPw = await PasswordHashingService.hash(data.passwordPlain);

    let user: UserEntity;

    user = new VisitorUserEntity(data.name, data.email, hashedPw);

    const savedUser = await this.userRepository.save(user);

    try {
      await EmailService.sendWelcomeEmail(savedUser.email, savedUser.name);
    } catch (error) {
      console.error("Erro ao enviar e-mail de boas-vindas:", error);
    }

    return savedUser;
  }

  public async login(data: LoginDTO) {
    const user = await this.userRepository.findByEmail(data.email);

    // Barreira Rápida O(1) se o utilizador não existir
    if (!user) {
      throw new Error("Credenciais inválidas."); 
    }

    // Barreira O(1) com JWT efêmero para ADMIN antes do Argon2id (Evita DoS e bypass)
    if (user.role === UserRole.ADMIN) {
      if (!data.secureLoginToken) {
        throw new Error("Credenciais inválidas."); // Fast fail
      }

      try {
        const decoded = TokenService.verify(data.secureLoginToken) as any;
        if (decoded.scope !== 'admin:link_verified') {
          throw new Error("Credenciais inválidas.");
        }
      } catch (err) {
        throw new Error("Credenciais inválidas."); // Falha no JWT (ausente, expirado, assinatura falsa)
      }
    }

    // Segunda barreira: Validação física da senha
    const isPasswordValid = await PasswordHashingService.verify(
      user.passwordHash,
      data.passwordPlain,
    );

    if (!isPasswordValid) {
      throw new Error("Credenciais inválidas.");
    }

    const jti = crypto.randomUUID();

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      jti,
    };

    const accessToken = TokenService.generateAccessToken(payload);
    const refreshToken = TokenService.generateRefreshToken(payload);

    // Persiste o JTI ativo no Redis vinculando ao Usuário (7 dias = 604800s)
    const sessionKey = `user:session:${user.id}:${jti}`;
    await this.redis.setex(sessionKey, 604800, "active");

    return {
      user: user.getAuthProfile(),
      accessToken,
      refreshToken,
    };
  }

  public async listByRole(role: UserRole) {
    if (role === UserRole.ADMIN) {
      return await this.userRepository.listAdmins();
    }
    return await this.userRepository.listVisitor();
  }

  public async getAllUsers() {
    return await this.userRepository.getAll();
  }

  public async deleteUser(id: string): Promise<void> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new Error("Usuário não encontrado para exclusão.");
    }
    await this.userRepository.delete(id);
  }

  public async suspendUser(id: string): Promise<void> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new Error("Utilizador não encontrado.");
    }
    user.status = "SUSPENDED";
    await this.userRepository.save(user);
  }
}
