import { RegisterDTO } from "../../core/models/User";
import { EmailError } from "../../core/error/email";
import { PasswordValidator, PasswordError } from "../../core/error/password";
import { ResolveMXService } from "../../core/email/resolveMXRecords.service";
import { EmailVerificationService } from "../../core/email/verifyEmailWithAbstract.service";

interface IValidationStrategy<T> {
  validate(data: T): Promise<void> | void;
}

class EmailSyntaxValidator implements IValidationStrategy<string> {
  validate(email: string): void {
    EmailError.verifyFormat(email);
  }
}

class EmailDomainValidator implements IValidationStrategy<string> {
  async validate(email: string): Promise<void> {
    const mxService = ResolveMXService.getInstance();
    const hasMx = await mxService.isValid(email);
    if (!hasMx) {
      throw new EmailError(
        "Domain invalid or incapable of receiving messages.",
      );
    }
  }
}

class EmailDeliverabilityValidator implements IValidationStrategy<string> {
  async validate(email: string): Promise<void> {
    const isDeliverable = await EmailVerificationService.isDeliverable(email);
    if (!isDeliverable) {
      throw new EmailError("Email address does not exist or is undeliverable.");
    }
  }
}

class PasswordStrengthValidator implements IValidationStrategy<string> {
  validate(password: string): void {
    const strength = PasswordValidator.getStrength(password);
    if (strength === "FRACA") {
      throw new PasswordError(
        "Password too weak. Include numbers, symbols and uppercase letters.",
        "PASSWORD_TOO_WEAK",
      );
    }
  }
}

export class UserValidator {
  private static readonly emailSyntax = new EmailSyntaxValidator();
  private static readonly emailDomain = new EmailDomainValidator();
  private static readonly emailDelivery = new EmailDeliverabilityValidator();
  private static readonly passwordStrength = new PasswordStrengthValidator();

  public static async validateRegistration(data: RegisterDTO): Promise<void> {
    this.emailSyntax.validate(data.email);

    await Promise.all([
      this.emailDomain.validate(data.email),
      this.passwordStrength.validate(data.passwordPlain),
    ]);

    await this.emailDelivery.validate(data.email);
  }
}
