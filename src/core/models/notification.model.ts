import { BaseEntity } from "../base/entity.base";
import { NotificationType } from "./Enums";

export interface INotification<T = any> {
  recipientId: string;
  senderId: string;
  type: NotificationType;
  message: string;
  data?: T;
  read: boolean;
  createdAt: Date;
}

export class Notification extends BaseEntity {
  public readonly createdAt: Date;
  public read: boolean = false;

  constructor(
    public readonly recipientId: string,
    public readonly senderId: string,
    public readonly type: NotificationType,
    public readonly message: string,
    public readonly data?: any,
    id?: string,
  ) {
    super(id);
    this.createdAt = new Date();
  }

  static createForInteraction(
    adminId: string,
    visitorId: string,
    visitorName: string,
    pubTitle: string,
    type: NotificationType.NEW_LIKE | NotificationType.NEW_SHARE,
  ): Notification {
    const action =
      type === NotificationType.NEW_LIKE ? "curtiu" : "compartilhou";
    const message = `${visitorName} ${action} sua publicação: "${pubTitle}"`;

    return new Notification(adminId, visitorId, type, message);
  }

  static createForNewContent(
    visitorId: string,
    pubTitle: string,
  ): Notification {
    const message = `Novo projeto publicado: "${pubTitle}". Confira as novidades!`;
    return new Notification(
      visitorId,
      "SYSTEM",
      NotificationType.NEW_PUBLICATION,
      message,
    );
  }

  public markAsRead(): void {
    this.read = true;
  }
}

/**
 * NotificationService: O "Cérebro" que decide quem notificar.
 * Aplica o padrão Observer de forma simplificada.
 */
export class NotificationService {
  /**
   * Lógica de Distribuição:
   * Se for uma interação, envia APENAS para o Admin.
   * Se for uma nova publicação, envia para os Visitantes.
   */
}
