import { Readable } from "stream";

export interface FileSignatureDefinition {
  mime: string;
  magic: number[];
}

const SIGNATURES: Record<string, FileSignatureDefinition> = {
  "image/png": { mime: "image/png", magic: [0x89, 0x50, 0x4e, 0x47] },
  "image/jpeg": { mime: "image/jpeg", magic: [0xff, 0xd8, 0xff] },
  "application/pdf": { mime: "application/pdf", magic: [0x25, 0x50, 0x44, 0x46] },
};

export class FileSignatureValidator {
  /**
   * Avalia os primeiros bytes de um Readable Stream em tempo real.
   */
  public static async validateStream(stream: Readable, expectedMime: string): Promise<boolean> {
    const signature = SIGNATURES[expectedMime];
    if (!signature) {
      return false; // MIME não suportado ou inválido
    }

    return new Promise((resolve) => {
      const onReadable = () => {
        const requiredLength = signature.magic.length;
        const chunk = stream.read(requiredLength);

        if (!chunk) {
          // Fallback se não há dados
          resolve(false);
          return;
        }

        const buffer = Buffer.from(chunk);
        const fileBytes = Array.from(buffer);

        // Comparação binária com a assinatura (Magic Bytes)
        const isMatch = signature.magic.every((byte, index) => fileBytes[index] === byte);

        // Retorna os bytes lidos ao início do fluxo (unshift)
        stream.unshift(chunk);
        
        // Remove os event listeners para evitar memory leaks
        stream.removeListener("readable", onReadable);
        stream.removeListener("error", onError);
        
        resolve(isMatch);
      };

      const onError = () => {
        stream.removeListener("readable", onReadable);
        stream.removeListener("error", onError);
        resolve(false);
      };

      stream.on("readable", onReadable);
      stream.on("error", onError);
    });
  }
}
