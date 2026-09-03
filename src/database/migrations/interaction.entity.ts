import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { InteractionType } from "../../core/models/Enums";
import { UserEntity } from "./user.entity";
import { PublicationEntity } from "./publication.entity";

@Entity("interactions")
@Index("IDX_audit_user_chronology", ["userId", "createdAt"])
@Index("IDX_audit_pub_chronology", ["publicationId", "createdAt"])
export class InteractionEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "user_id", nullable: true })
  userId!: string | null;

  @Column({ type: "uuid", name: "publication_id" })
  publicationId!: string;

  @Column({
    type: "enum",
    enum: InteractionType,
  })
  type!: InteractionType;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @DeleteDateColumn({ name: "deleted_at", type: "timestamp", nullable: true })
  deletedAt!: Date | null;

  @ManyToOne(() => UserEntity, (user) => user.id, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "user_id" })
  user!: UserEntity | null;

  @ManyToOne(() => PublicationEntity, (pub) => pub.interactions, { onDelete: "CASCADE" })
  @JoinColumn({ name: "publication_id" })
  publication!: PublicationEntity;
}
