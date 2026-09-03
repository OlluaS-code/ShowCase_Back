import "reflect-metadata";
import { DataSource } from "typeorm";
import { InteractionEntity } from "../../database/migrations/interaction.entity";
import { NotificationEntity } from "../../database/migrations/notification.entity";
import { PublicationEntity } from "../../database/migrations/publication.entity";
import { SpecificationEntity } from "../../database/migrations/specification.entity";
import {
  AdminUserEntity,
  VisitorUserEntity,
  UserEntity,
} from "../../database/migrations/user.entity";
import { config } from "./config";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: config.DATABASE_URL,
  synchronize: config.NODE_ENV === "test",
  logging: false,
  entities: [
    InteractionEntity,
    NotificationEntity,
    PublicationEntity,
    AdminUserEntity,
    VisitorUserEntity,
    UserEntity,
    SpecificationEntity,
  ],
  migrations: [],
  subscribers: [],
});
