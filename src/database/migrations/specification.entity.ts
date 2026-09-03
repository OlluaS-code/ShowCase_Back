import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity("specifications")
export class SpecificationEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 100 })
  tag!: string;

  @Column({ type: "varchar", length: 200 })
  title!: string;

  @Column({ type: "text" })
  description!: string;

  @Column({ type: "text", name: "icon_svg" })
  iconSvg!: string;

  @Column({ type: "boolean", default: false, name: "is_wide" })
  isWide!: boolean;

  @Column({ type: "int", default: 0 })
  order!: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
