import { BaseEntity } from "../base/entity.base";
import { MediaType, ProjectCategory } from "./Enums";

export class Publication extends BaseEntity {
  public readonly createdAt: Date;

  constructor(
    public title: string,
    public content: string,
    public category: ProjectCategory,
    public media: Array<{ url: string; type: "image" | "video" }> = [],
    public thumbnailUrl?: string,
    public techStack: string[] = [],
    id?: string,
  ) {
    super(id);
    this.createdAt = new Date();
  }

  get contentLength(): number {
    return this.content.length;
  }
}
