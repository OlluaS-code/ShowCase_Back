import { Repository } from "typeorm";
import { PublicationEntity } from "../../database/migrations/publication.entity";
import { InteractionRepository } from "../repositories/InteractionRepository";
import {
  InteractionType,
  NotificationType,
  UserRole,
} from "../../core/models/Enums";
import { UserEntity } from "../../database/migrations/user.entity";
import { NotificationService } from "./NotificationService";

export class InteractionService {
  constructor(
    private userRepo: Repository<UserEntity>,
    private interactionRepo: InteractionRepository,
    private pubRepo: Repository<PublicationEntity>,
    private notificationService: NotificationService,
  ) {}

  private async getAdmin(): Promise<UserEntity | null> {
    return await this.userRepo.findOne({ where: { role: UserRole.ADMIN } });
  }

  private async findPublicationById(
    publicationId: string,
  ): Promise<PublicationEntity | null> {
    return await this.pubRepo.findOne({ where: { id: publicationId } });
  }

  async toggleLike(userId: string, publicationId: string) {
    // Busca incluindo os deletados (withDeleted: true)
    const existing = await this.interactionRepo.findExisting(
      userId,
      publicationId,
      InteractionType.LIKE,
      true
    );

    if (existing) {
      if (existing.deletedAt) {
        // Se já existia e estava descurtido, restaura.
        // NÃO enviamos notificação para evitar spam.
        await this.interactionRepo.restore(existing.id);
        return { action: "restored", data: existing };
      } else {
        // Se já existe e está ativo, o usuário está removendo o like.
        await this.interactionRepo.softRemove(existing.id);
        return { action: "removed" };
      }
    }

    // Se a interação nunca existiu (primeiro Like), cria e notifica
    const interaction = await this.interactionRepo.save(
      userId || null,
      publicationId,
      InteractionType.LIKE,
    );

    const pub = await this.findPublicationById(publicationId);
    const admin = await this.getAdmin();
    let userName = "Um visitante anônimo";

    if (userId) {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (user) userName = user.name;
    }

    if (pub && admin) {
      const targets = NotificationService.dispatch({
        type: NotificationType.NEW_LIKE,
        sender: { id: userId || "anonymous", name: userName },
        pub: pub,
        adminId: admin.id,
        visitors: [],
      });

      for (const target of targets) {
        await this.notificationService.pushNotification(
          target.recipientId,
          NotificationType.NEW_LIKE,
          target.data,
        );
      }
    }

    return { action: "added", data: interaction };
  }

  async share(userId: string, publicationId: string) {
    const interaction = await this.interactionRepo.save(
      userId || null,
      publicationId,
      InteractionType.SHARE,
    );

    const pub = await this.findPublicationById(publicationId);
    const admin = await this.getAdmin();

    let userName = "Um visitante anônimo";
    if (userId) {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (user) userName = user.name;
    }

    if (pub && admin) {
      const targets = NotificationService.dispatch({
        type: NotificationType.NEW_SHARE,
        sender: { id: userId || "anonymous", name: userName },
        pub: pub,
        adminId: admin.id,
        visitors: [],
      });

      for (const target of targets) {
        await this.notificationService.pushNotification(
          target.recipientId,
          NotificationType.NEW_SHARE,
          target.data,
        );
      }
    }
    return { action: "shared", data: interaction };
  }

  async getAuditChronology(userId: string) {
    return await this.interactionRepo.getAuditChronology(userId);
  }

  async getGlobalAuditChronology() {
    return await this.interactionRepo.getGlobalAuditChronology();
  }
}
