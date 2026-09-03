import { Repository } from "typeorm";
import { SpecificationEntity } from "../../database/migrations/specification.entity";
import { UserEntity } from "../../database/migrations/user.entity";
import { NotificationService } from "./NotificationService";
import { NotificationType, UserRole } from "../../core/models/Enums";

export class SpecificationService {
  constructor(
    private specRepo: Repository<SpecificationEntity>,
    private userRepo: Repository<UserEntity>,
    private notificationService: NotificationService
  ) {}

  async getAll() {
    return await this.specRepo.find({
      order: {
        order: "ASC",
        createdAt: "ASC"
      },
    });
  }

  async create(data: Partial<SpecificationEntity>) {
    const spec = this.specRepo.create(data);
    const savedSpec = await this.specRepo.save(spec);

    const visitors = await this.userRepo.find({
      where: { role: UserRole.VISITOR },
    });

    if (visitors.length > 0) {
      const notifications = NotificationService.dispatch({
        type: NotificationType.NEW_SPECIFICATION,
        pub: { id: savedSpec.id, title: savedSpec.title }, // Reusing pub interface for specs
        visitors: visitors,
        adminId: "",
      });

      for (const n of notifications) {
        await this.notificationService.pushNotification(
          n.recipientId,
          NotificationType.NEW_SPECIFICATION,
          n.data,
        );
      }
    }

    return savedSpec;
  }

  async update(id: string, data: Partial<SpecificationEntity>) {
    const spec = await this.specRepo.findOne({ where: { id } });
    if (!spec) {
      throw new Error("Specification not found");
    }
    
    // Atualiza apenas os campos passados
    Object.assign(spec, data);
    return await this.specRepo.save(spec);
  }

  async delete(id: string) {
    const spec = await this.specRepo.findOne({ where: { id } });
    if (!spec) {
      throw new Error("Specification not found");
    }
    
    await this.specRepo.remove(spec);
    return { id, deleted: true };
  }
}
