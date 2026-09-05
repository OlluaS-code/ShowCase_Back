import { EventEmitter } from "events";
import { config } from "../../utils/settings/config";
import {
  NotificationMessages,
  NotificationType,
} from "../../core/models/Enums";
import { NotificationEntity } from "../../database/migrations/notification.entity";
import { NotificationRepository } from "../repositories/NotificationRepository";
import { EmailService } from "../../core/email/email";

export const NotificationEmitter = new EventEmitter();

export class NotificationService {
  constructor(private readonly repo: NotificationRepository) {}

  async getUserNotifications(userId: string): Promise<NotificationEntity[]> {
    const notifications = await this.repo.findByUser(userId);

    return [...notifications].sort((a, b) => {
      if (a.read === b.read) {
        return b.createdAt.getTime() - a.createdAt.getTime();
      }

      return a.read ? 1 : -1;
    });
  }

  public static dispatch(event: {
    type: NotificationType;
    sender?: { id: string; name: string };
    pub: { title: string; id: string };
    adminId: string;
    visitors: Array<{ id: string }>;
  }): Array<{ recipientId: string; data: any }> {
    const targets: Array<{ recipientId: string; data: any }> = [];

    if (event.type === NotificationType.NEW_PUBLICATION || event.type === NotificationType.NEW_SPECIFICATION) {
      event.visitors.forEach((v) => {
        targets.push({
          recipientId: v.id,
          data: { title: event.pub.title, pubId: event.pub.id },
        });
      });
    } else {
      targets.push({
        recipientId: event.adminId,
        data: { senderName: event.sender!.name, pubTitle: event.pub.title, pubId: event.pub.id },
      });
    }

    return targets;
  }

  async readNotifications(
    userId: string,
    notificationIds: string[],
  ): Promise<void> {
    await this.repo.markAsRead(notificationIds);
  }

  async pushNotification<
    T extends { senderName?: string; pubTitle?: string; title?: string },
  >(
    recipientId: string,
    type: NotificationType,
    data: T,
    senderId?: string,
  ): Promise<NotificationEntity> {
    const message = NotificationMessages[type](data);

    const notification = await this.repo.create({
      recipientId,
      senderId,
      type,
      message,
      data,
    });

    NotificationEmitter.emit(`user:${recipientId}`, notification);

    const recipient = await this.repo.getUserEmail(recipientId);

    if (recipient?.email) {
      let actionLink: string | undefined;
      let actionText = "Ver Publicação";

      const baseUrl = config.APP_FRONTEND_URL.replace(/\/+$/, "");

      if (type === NotificationType.NEW_PUBLICATION && data && (data as any).pubId) {
        actionLink = `${baseUrl}/#/?open=${(data as any).pubId}`; 
      } else if (type === NotificationType.NEW_SPECIFICATION) {
        actionLink = `${baseUrl}/#/`; 
        actionText = "Ver Nova Especialidade";
      }

      this.sendEmailAsync(recipient.email, type, message, actionLink, actionText);
    }

    return notification;
  }

  async deleteNotification(
    userId: string,
    notificationId: string,
  ): Promise<void> {
    await this.repo.delete(userId, notificationId);
  }

  private sendEmailAsync(
    email: string,
    type: NotificationType,
    message: string,
    actionLink?: string,
    actionText?: string
  ): void {
    EmailService.sendNotificationEmail(
      email,
      `Nova Notificação: ${type}`,
      message,
      actionLink,
      actionText
    ).catch((err: Error) => {
      console.error(`Email delivery failure: ${email}`, err.message);
    });
  }
}
