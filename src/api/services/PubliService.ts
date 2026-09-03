import { Repository } from "typeorm";
import { PubliRepository } from "../repositories/PubliRepository";
import { UserEntity } from "../../database/migrations/user.entity";
import { PublicationEntity } from "../../database/migrations/publication.entity";
import { NotificationType, ProjectCategory, UserRole } from "../../core/models/Enums";
import { PublicationFolder } from "../../core/models/publication-folder.model";
import { NotificationService } from "./NotificationService";

export class PubliService {
  constructor(
    private publiRepo: PubliRepository,
    private userRepo: Repository<UserEntity>,
    private notificationService: NotificationService,
  ) {}

  async createPublication(
    data: Partial<PublicationEntity>,
  ): Promise<PublicationEntity> {
    if (data.media) {
      const urlSet = new Set<string>();
      for (const item of data.media) {
        if (urlSet.has(item.url)) {
          throw new Error("Erro de Validação: Não é permitido anexar URLs de mídias idênticas na mesma publicação.");
        }
        urlSet.add(item.url);
      }
    }

    const pub = await this.publiRepo.create(data);

    const visitors = await this.userRepo.find({
      where: { role: UserRole.VISITOR },
    });

    if (visitors.length > 0) {
      const notifications = NotificationService.dispatch({
        type: NotificationType.NEW_PUBLICATION,
        pub: { id: pub.id, title: pub.title },
        visitors: visitors,
        adminId: "",
      });

      for (const n of notifications) {
        await this.notificationService.pushNotification(
          n.recipientId,
          NotificationType.NEW_PUBLICATION,
          n.data,
        );
      }
    }

    return pub;
  }

  async updatePublication(id: string, data: Partial<PublicationEntity>): Promise<PublicationEntity> {
    const existing = await this.publiRepo.findById(id);
    if (!existing) {
      throw new Error("Publicação não encontrada");
    }
    
    if (data.media) {
      const urlSet = new Set<string>();
      for (const item of data.media) {
        if (urlSet.has(item.url)) {
          throw new Error("Erro de Validação: Não é permitido anexar URLs de mídias idênticas na mesma publicação.");
        }
        urlSet.add(item.url);
      }
    }

    const updated = await this.publiRepo.update(id, data);
    return updated!;
  }

  async deletePublication(id: string): Promise<void> {
    const existing = await this.publiRepo.findById(id);
    if (!existing) {
      throw new Error("Publicação não encontrada");
    }
    await this.publiRepo.delete(id);
  }

  async getGlobalFeed(): Promise<PublicationEntity[]> {
    return await this.publiRepo.findAll();
  }

  async searchInFolder(
    category: ProjectCategory,
    title: string,
  ): Promise<PublicationEntity[]> {
    const pubs = await this.publiRepo.findByCategory(category);
    const folder = new PublicationFolder();

    pubs.forEach((p) => folder.add(p));

    return folder.autoComplete(category, title);
  }

  async findSpecificInFolder(
    category: ProjectCategory,
    exactTitle: string,
  ): Promise<PublicationEntity | null> {
    const pubs = await this.publiRepo.findByCategory(category);
    const folder = new PublicationFolder();

    pubs.forEach((p) => folder.add(p));

    return folder.findExact(category, exactTitle);
  }

  async getRankedPublications(): Promise<PublicationEntity[]> {
    const pubs = await this.publiRepo.findAll();

    return [...pubs].sort(
      (a, b) => (b.interactions?.length || 0) - (a.interactions?.length || 0),
    );
  }
}
