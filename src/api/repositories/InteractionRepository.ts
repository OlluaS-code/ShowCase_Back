import { Repository, DataSource } from "typeorm";
import { InteractionEntity } from "../../database/migrations/interaction.entity";
import { InteractionType } from "../../core/models/Enums";

export class InteractionRepository {
  private repo: Repository<InteractionEntity>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(InteractionEntity);
  }

  async save(
    userId: string | null,
    publicationId: string,
    type: InteractionType,
  ): Promise<InteractionEntity> {
    const interaction = this.repo.create({ userId, publicationId, type });
    return await this.repo.save(interaction);
  }

  async findExisting(
    userId: string | null,
    publicationId: string,
    type: InteractionType,
    withDeleted: boolean = false,
  ): Promise<InteractionEntity | null> {
    if (!userId) return null; // Não tenta buscar existente para usuários anônimos (sempre deixa curtir/compartilhar)
    return await this.repo.findOne({
      where: {
        userId,
        publicationId,
        type,
      },
      withDeleted,
    });
  }

  async softRemove(id: string): Promise<void> {
    await this.repo.softDelete(id);
  }

  async restore(id: string): Promise<void> {
    await this.repo.restore(id);
  }

  async getAuditChronology(userId: string): Promise<InteractionEntity[]> {
    return await this.repo.find({
      where: { userId },
      order: { createdAt: "DESC" },
      relations: ["publication"],
    });
  }

  async getGlobalAuditChronology(): Promise<InteractionEntity[]> {
    return await this.repo.find({
      order: { createdAt: "DESC" },
      relations: ["publication", "user"],
      take: 100 // Limitar para segurança de performance no frontend, ideal com paginação
    });
  }
}
