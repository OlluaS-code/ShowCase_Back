import { Repository } from "typeorm";
import { AppDataSource } from "../../utils/settings/data-source";
import { BaseRepository } from "../../core/base/BaseRepo";
import {
  UserEntity,
  AdminUserEntity,
  VisitorUserEntity,
} from "../../database/migrations/user.entity";

export class UserRepository extends BaseRepository<UserEntity> {
  private readonly adminRepo: Repository<AdminUserEntity>;
  private readonly visitorRepo: Repository<VisitorUserEntity>;

  constructor() {
    const baseRepo = AppDataSource.getRepository(UserEntity);
    super(baseRepo);

    this.adminRepo = AppDataSource.getRepository(AdminUserEntity);
    this.visitorRepo = AppDataSource.getRepository(VisitorUserEntity);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.entityRepo.findOneBy({ email } as any);
  }

  async listAdmins() {
    return this.adminRepo.find();
  }
  async listVisitor() {
    return this.visitorRepo.find();
  }
}
