import {
  AuthorizationStrategy,
  ResourceContext,
} from "../AuthorizationStrategy";

export class UserDeletionStrategy implements AuthorizationStrategy {
  public async isAuthorized(context: ResourceContext): Promise<boolean> {
    // Regra RBAC: Administradores possuem bypass completo
    if (context.role === "ADMIN") {
      return true;
    }
    // Regra ABAC: Utilizadores comuns só podem eliminar a sua própria conta
    return context.userId === context.resourceId;
  }
}
