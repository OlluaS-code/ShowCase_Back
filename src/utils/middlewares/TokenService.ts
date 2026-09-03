import * as jwt from "jsonwebtoken";
import { config } from "../settings/config";
import { UserRole } from "../../core/models/Enums";

/** Dados de entrada ao gerar um token — sem campos injetados pelo JWT */
interface TokenInput {
  sub: string;
  email: string;
  role: UserRole;
  jti?: string;
}

/**
 * Payload completo decodificado de um JWT.
 * O campo `exp` é injetado automaticamente pelo jsonwebtoken no momento da assinatura
 * e está sempre presente após jwt.verify().
 */
export interface TokenPayload extends TokenInput {
  /** Expiração em Unix epoch segundos — injetado pelo jsonwebtoken */
  exp: number;
}

export class TokenService {

  public static generateAccessToken(payload: TokenInput): string {
    return jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.ACCESS_TOKEN_EXPIRATION_SECONDS,
    });
  }

  public static generateRefreshToken(payload: TokenInput): string {
    return jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.REFRESH_TOKEN_EXPIRATION_DAYS,
    });
  }

  public static verify(token: string): TokenPayload {
    return jwt.verify(token, config.JWT_SECRET) as TokenPayload;
  }

  /**
   * Gera um token de login seguro de curtíssima duração.
   * Utilizado como barreira de segurança para administradores após a validação do link.
   */
  public static generateAdminBarrierToken(): string {
    return jwt.sign({ scope: 'admin:link_verified' }, config.JWT_SECRET, {
      expiresIn: '5m' // Vida útil de 5 minutos
    });
  }
}
