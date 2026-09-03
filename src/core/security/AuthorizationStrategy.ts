export interface ResourceContext {
  userId: string;
  role: string;
  resourceId?: string;
}

export interface AuthorizationStrategy {
  isAuthorized(context: ResourceContext): Promise<boolean>;
}
