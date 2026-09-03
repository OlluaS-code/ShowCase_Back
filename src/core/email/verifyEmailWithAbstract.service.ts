import axios from "axios";
import { config } from "../../utils/settings/config";
import { EmailError } from "../error/email";

interface AbstractApiResponse {
  email_deliverability: {
    status: string;
    deliverability: string;
    is_valid_format: {
      value: boolean;
    };
  };
}

export class EmailVerificationService {
  private static readonly URL = config.ABSTRACT_API_URL.replace(/\/$/, "");
  private static readonly API_KEY = config.ABSTRACT_API_KEY;

  public static async isDeliverable(email: string): Promise<boolean> {
    if (config.NODE_ENV === "test") return true;

    EmailError.verifyFormat(email);

    let delay = 1000;
    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await axios.get<AbstractApiResponse>(this.URL, {
          params: {
            api_key: this.API_KEY,
            email,
          },
          timeout: 10000,
        });

        const data = response.data;

        if (data.email_deliverability?.is_valid_format?.value === false) {
          return false;
        }

        const status = data.email_deliverability?.status;

        return status !== "undeliverable";
      } catch (error: any) {
        if (error.response?.status === 429 && attempt < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
          continue;
        }

        console.error(
          `[EmailVerification] Erro na tentativa ${attempt + 1}:`,
          error.message,
        );
        if (attempt === maxRetries - 1) return true;
      }
    }

    return true;
  }
}
