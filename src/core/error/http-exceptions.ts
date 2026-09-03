/**
 * Exceções de domínio da aplicação.
 *
 * Classes semânticas que permitem ao Error Handler global
 * mapear erros de negócio para códigos HTTP corretos,
 * sem vazar informações internas (DB, stack traces).
 */

export class ApplicationException extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "ApplicationException";
  }
}

/** Recurso não encontrado — HTTP 404 */
export class ResourceNotFoundException extends ApplicationException {
  constructor(message = "O recurso solicitado não foi localizado.") {
    super(404, message);
  }
}

/** Conflito de dados (ex: registro duplicado) — HTTP 409 */
export class ConflictException extends ApplicationException {
  constructor(message = "O registro informado já existe no sistema.") {
    super(409, message);
  }
}

/** Dados inválidos fornecidos pelo cliente — HTTP 400 */
export class BadRequestException extends ApplicationException {
  constructor(message = "Os dados fornecidos são inválidos.") {
    super(400, message);
  }
}

/** Acesso não autorizado — HTTP 401 */
export class UnauthorizedException extends ApplicationException {
  constructor(message = "Autenticação necessária para acessar este recurso.") {
    super(401, message);
  }
}

/** Acesso proibido — HTTP 403 */
export class ForbiddenException extends ApplicationException {
  constructor(message = "Acesso proibido: privilégios insuficientes.") {
    super(403, message);
  }
}
