export enum UserRole {
  ADMIN = "ADMIN",
  VISITOR = "VISITOR",
}

export enum InteractionType {
  LIKE = "LIKE",
  SHARE = "SHARE",
}

export enum NotificationType {
  NEW_PUBLICATION = "NEW_PUBLICATION",
  NEW_LIKE = "NEW_LIKE",
  NEW_SHARE = "NEW_SHARE",
  SYSTEM_ALERT = "SYSTEM_ALERT",
  NEW_SPECIFICATION = "NEW_SPECIFICATION",
}

export const NotificationMessages: Record<
  NotificationType,
  (data: any) => string
> = {
  [NotificationType.NEW_PUBLICATION]: (data) =>
    `Novo projeto publicado: ${data.title}`,
  [NotificationType.NEW_LIKE]: (data) =>
    `${data.senderName} curtiu seu projeto "${data.pubTitle}"`,
  [NotificationType.NEW_SHARE]: (data) =>
    `${data.senderName} compartilhou seu projeto "${data.pubTitle}"`,
  [NotificationType.SYSTEM_ALERT]: (data) =>
    `Alerta do Sistema: ${data.message}`,
  [NotificationType.NEW_SPECIFICATION]: (data) =>
    `Nova especialidade adicionada: ${data.title}`,
};

export enum ProjectCategory {
  FRONTEND = "Frontend",
  BACKEND = "Backend",
  MOBILE = "Mobile",
  FULLSTACK = "FullStack",
  DEVOPS = "DevOps",
}

export enum MediaType {
  VIDEO = "video",
  IMAGE = "image",
}
