import { BaseEntity } from "../base/entity.base";
import { User } from "./User";
import { Publication } from "./publication.model";
import { InteractionType } from "./Enums";

export interface IInteraction {
  userId: string;
  publicationId: string;
  type: InteractionType;
  createdAt: Date;
}

export class Interaction extends BaseEntity {
  public readonly createdAt: Date;

  constructor(
    public readonly userId: string,
    public readonly publicationId: string,
    public readonly type: InteractionType,
    id?: string,
  ) {
    super(id);
    this.createdAt = new Date();
  }

  static createLike(user: User, pub: Publication): Interaction {
    return new Interaction(user.id, pub.id, InteractionType.LIKE);
  }

  static createShare(user: User, pub: Publication): Interaction {
    return new Interaction(user.id, pub.id, InteractionType.SHARE);
  }
}
