import { DataSource, Repository, In } from "typeorm";
import { NotificationEntity } from "../../database/migrations/notification.entity";

export class NotificationRepository {
  private repo: Repository<NotificationEntity>;

  constructor(db: DataSource) {
    if (!db) {
      throw new Error(
        "DataSource não foi fornecido para o NotificationRepository!",
      );
    }
    this.repo = db.getRepository(NotificationEntity);
  }

  async findByUser(recipientId: string): Promise<NotificationEntity[]> {
    return await this.repo.find({
      where: { recipientId },
      relations: ["sender"],
      order: { createdAt: "DESC" },
    });
  }

  async markAsRead(ids: string[]): Promise<void> {
    await this.repo.update({ id: In(ids) }, { read: true });
  }

  async create(data: Partial<NotificationEntity>): Promise<NotificationEntity> {
    const notification = this.repo.create(data);
    return await this.repo.save(notification);
  }

  async delete(userId: string, id: string): Promise<void> {
    await this.repo.delete({ id, recipientId: userId });
  }

  async getUserEmail(recipientId: string): Promise<{ email: string } | null> {
    const result = await this.repo.query(
      `SELECT email FROM users WHERE id = $1`,
      [recipientId],
    );

    return result.length > 0 ? { email: result[0].email } : null;
  }
}
