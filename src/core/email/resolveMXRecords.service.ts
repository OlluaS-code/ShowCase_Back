import { promises as dns, MxRecord } from "node:dns";
import { EmailError } from "../error/email";
import { config } from "../../utils/settings/config";

export interface IDomainValidator {
  isValid(email: string): Promise<boolean>;
}

export class ResolveMXService implements IDomainValidator {
  private static instance: ResolveMXService;

  private constructor() {}

  public static getInstance(): ResolveMXService {
    if (!ResolveMXService.instance) {
      ResolveMXService.instance = new ResolveMXService();
    }
    return ResolveMXService.instance;
  }

  public async isValid(email: string): Promise<boolean> {
    if (config.NODE_ENV === "test") return true;

    const domain = this.extractDomain(email);

    try {
      const records = await dns.resolveMx(domain);

      if (!records || records.length === 0) {
        return false;
      }

      const sortedRecords = this.sortRecordsByPriority(records);

      return sortedRecords.length > 0;
    } catch (error: any) {
      if (error.code === "ENOTFOUND" || error.code === "ENODATA") {
        return false;
      }

      console.error(
        `[DNS_RESOLVER_ERROR]: Falha ao validar domínio ${domain}.`,
        error.message,
      );
      return true;
    }
  }

  private extractDomain(email: string): string {
    const parts = email.split("@");
    if (parts.length !== 2) {
      throw new EmailError(
        "Formato de e-mail inválido para extração de domínio.",
      );
    }
    return parts[1];
  }

  private sortRecordsByPriority(records: MxRecord[]): MxRecord[] {
    return [...records].sort((a, b) => a.priority - b.priority);
  }
}
