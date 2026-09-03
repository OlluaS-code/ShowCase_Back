export class PasswordError extends Error {
  public readonly code: string;

  constructor(message: string, code: "INVALID_LENGTH" | "PASSWORD_TOO_WEAK") {
    super(message);
    this.name = "PasswordError";
    this.code = code;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PasswordError);
    }
  }
}

export type PasswordStrength = "FRACA" | "MODERADA" | "FORTE";

export class PasswordValidator {
  private static readonly MIN_LENGTH = 6;

  private static readonly SPECIAL_REGEX =
    /[!@#$%^&*()\-=_+[\]{};':"\\|,.<>/?~`]/;
  private static readonly NUMBER_REGEX = /[0-9]/;
  private static readonly UPPER_REGEX = /[A-Z]/;

  public static getStrength(password: string): PasswordStrength {
    if (password.length < this.MIN_LENGTH) {
      throw new PasswordError(
        `A senha deve ter no mínimo ${this.MIN_LENGTH} caracteres.`,
        "INVALID_LENGTH",
      );
    }

    let score = 0;
    if (this.NUMBER_REGEX.test(password)) score++;
    if (this.SPECIAL_REGEX.test(password)) score++;
    if (this.UPPER_REGEX.test(password)) score++;
    if (password.length > 10) score++;

    if (score <= 2) return "FRACA";
    if (score === 3) return "MODERADA";
    return "FORTE";
  }
}
