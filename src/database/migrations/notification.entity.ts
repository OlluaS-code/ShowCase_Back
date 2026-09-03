import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { NotificationType } from "../../core/models/Enums";
import { UserEntity } from "./user.entity";

@Entity("notifications")
export class NotificationEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "recipient_id" })
  recipientId!: string;

  @Column({ type: "uuid", name: "sender_id", nullable: true })
  senderId!: string;

  @Column({
    type: "enum",
    enum: NotificationType,
  })
  type!: NotificationType;

  @Column({ type: "text" })
  message!: string;

  @Column({ type: "jsonb", nullable: true })
  data!: any;

  @Column({ type: "boolean", default: false })
  read!: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @ManyToOne(() => UserEntity, (user) => user.notifications, {
    onDelete: "CASCADE",
  })
  user: UserEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "recipient_id" })
  recipient!: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: "sender_id" })
  sender?: UserEntity;
}
