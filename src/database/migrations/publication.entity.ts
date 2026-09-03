import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  AfterLoad,
} from "typeorm";
import { InteractionEntity } from "./interaction.entity";
import { MediaType, ProjectCategory } from "../../core/models/Enums";

@Entity("publications")
export class PublicationEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar" })
  title!: string;

  @Column({ type: "text" })
  content!: string;

  @Column({
    type: "enum",
    enum: ["Frontend", "Backend", "Mobile", "FullStack", "DevOps"],
  })
  category!: ProjectCategory;

  // Mantidas como nullables para viabilizar compatibilidade e n\u00e3o quebrar dados antigos
  @Column({ type: "varchar", nullable: true, name: "media_url" })
  mediaUrl!: string | null;

  @Column({
    type: "enum",
    enum: ["video", "image"],
    default: "image",
    name: "media_type",
    nullable: true,
  })
  mediaType!: MediaType | null;

  @Column({
    type: "jsonb",
    nullable: false,
    array: false, // Previne mapeamento err\u00f4neo
    name: "media",
    default: () => "'[]'::jsonb" // Sanatiza loop de migra\u00e7\u00e3o infinita do TypeORM
  })
  media!: Array<{ url: string; type: "image" | "video" }>;

  @Column({ type: "varchar", nullable: true, name: "thumbnail_url" })
  thumbnailUrl?: string;

  @Column("simple-array", { nullable: true, name: "tech_stack" })
  techStack!: string[];

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @OneToMany(() => InteractionEntity, (interaction) => interaction.publication)
  interactions!: InteractionEntity[];

  get contentLength(): number {
    return this.content ? this.content.length : 0;
  }
  
  @AfterLoad()
  public handleLegacyMediaFallback(): void {
    if ((!this.media || this.media.length === 0) && this.mediaUrl) {
      const legacyType: MediaType = this.mediaType === MediaType.VIDEO ? MediaType.VIDEO : MediaType.IMAGE;
      this.media = [{ url: this.mediaUrl, type: legacyType as "image" | "video" }];
    }
    if (!this.media) {
      this.media = [];
    }
  }
}
