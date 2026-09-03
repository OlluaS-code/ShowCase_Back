import { FastifyRequest, FastifyReply } from "fastify";
import { UserService } from "../services/UserService";
import { RegisterDTO, LoginDTO } from "../../core/models/User";
import { PasswordError, PasswordValidator } from "../../core/error/password";
import { EmailError } from "../../core/error/email";
import { UserValidator } from "../../utils/middlewares/UserValidator";
import { TokenService } from "../../utils/middlewares/TokenService";

export class UserController {
  constructor(private userService: UserService) {}

  public async register(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = request.body as RegisterDTO;

      await UserValidator.validateRegistration(data);

      const user = await this.userService.register(data);
      const strength = PasswordValidator.getStrength(data.passwordPlain);

      return reply.status(201).send({
        ...user,
        passwordStrength: strength,
      });
    } catch (error) {
      return this.handleError(reply, error, "Registration Error");
    }
  }

  public async login(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = request.body as LoginDTO;
      const result = await this.userService.login(data);

      return reply.status(200).send(result);
    } catch (error) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: (error as Error).message,
      });
    }
  }

  async getAll(req: FastifyRequest, reply: FastifyReply) {
    try {
      const users = await this.userService.getAllUsers();
      // Mapeamos para não expor a passwordHash
      const safeUsers = users.map(u => u.getAuthProfile());
      return reply.send(safeUsers);
    } catch (error: unknown) {
      req.log.error(error);
      return reply.status(500).send({
        error: "Internal Server Error",
        message: "Erro ao buscar usuários.",
      });
    }
  }

  public async delete(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      await this.userService.deleteUser(id);
      return reply.status(204).send();
    } catch (error) {
      return reply.status(400).send({
        error: "Delete Failed",
        message: (error as Error).message,
      });
    }
  }

  public async suspend(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const { tokenSignature, tokenExpiryTimestamp } = request.body as { tokenSignature: string; tokenExpiryTimestamp: number };

      await this.userService.suspendUser(id);

      const now = Math.floor(Date.now() / 1000);
      const remainingTimeSeconds = tokenExpiryTimestamp - now;

      if (remainingTimeSeconds > 0 && tokenSignature) {
        try {
          const decoded = TokenService.verify(tokenSignature);
          const cacheKey = decoded.jti ? `blacklist:jti:${decoded.jti}` : `blacklist:jwt:${tokenSignature}`;
          await request.server.redis.set(cacheKey, "revoked", "EX", remainingTimeSeconds);
        } catch {
          // Fallback if token is invalid but we still want to blacklist the signature
          const redisKey = `blacklist:jwt:${tokenSignature}`;
          await request.server.redis.set(redisKey, "revoked", "EX", remainingTimeSeconds);
        }
      }

      return reply.status(200).send({ message: "Utilizador suspenso e tokens de acesso revogados." });
    } catch (error) {
      return reply.status(400).send({
        error: "Suspend Failed",
        message: (error as Error).message,
      });
    }
  }

  private handleError(
    reply: FastifyReply,
    error: unknown,
    defaultTitle: string,
  ) {
    if (error instanceof PasswordError) {
      return reply.status(400).send({
        error: "Security Requirement",
        code: error.code,
        message: error.message,
      });
    }

    if (error instanceof EmailError) {
      return reply.status(400).send({
        error: "Validation Error",
        message: error.message,
      });
    }

    return reply.status(400).send({
      error: defaultTitle,
      message: (error as Error).message,
    });
  }
}
