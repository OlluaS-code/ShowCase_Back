import { Repository as TypeORMRepository, ObjectLiteral } from "typeorm";

interface Identifiable {
  id: string;
}

export abstract class BaseRepository<T extends ObjectLiteral & Identifiable> {
  constructor(protected readonly entityRepo: TypeORMRepository<T>) {}

  public async save(item: T): Promise<T> {
    return await this.entityRepo.save(item);
  }

  public async findById(id: any): Promise<T | null> {
    return await this.entityRepo.findOneBy({ id } as any);
  }

  public async getAll(): Promise<T[]> {
    return await this.entityRepo.find();
  }

  public async delete(id: string): Promise<void> {
    await this.entityRepo.delete(id);
  }
}
