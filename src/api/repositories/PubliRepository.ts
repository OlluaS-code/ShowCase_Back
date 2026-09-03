import { DataSource, Repository } from "typeorm";
import { PublicationEntity } from "../../database/migrations/publication.entity";
import { ProjectCategory } from "../../core/models/Enums";

export class PubliRepository {
  private repo: Repository<PublicationEntity>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(PublicationEntity);
  }

  async create(data: Partial<PublicationEntity>): Promise<PublicationEntity> {
    const publication = this.repo.create(data);
    return await this.repo.save(publication);
  }

  async findAll(): Promise<PublicationEntity[]> {
    return await this.repo.find({
      relations: ["interactions", "interactions.user"],
      order: { createdAt: "DESC" },
    });
  }

  async findByCategory(
    category: ProjectCategory,
  ): Promise<PublicationEntity[]> {
    return await this.repo.find({ where: { category } });
  }

  async findById(id: string): Promise<PublicationEntity | null> {
    return await this.repo.findOne({
      where: { id },
      relations: ["interactions"],
    });
  }

  async update(id: string, data: Partial<PublicationEntity>): Promise<PublicationEntity | null> {
    await this.repo.update(id, data);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repo.delete(id);
    return result.affected !== null && result.affected! > 0;
  }
}
