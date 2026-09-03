import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  TableInheritance,
  ChildEntity,
  OneToMany,
} from "typeorm";
import { UserRole } from "../../core/models/Enums";
import { NotificationEntity } from "./notification.entity";

@Entity("users")
@TableInheritance({ column: { type: "enum", enum: UserRole, name: "role" } })
export abstract class UserEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar" })
  name!: string;

  @Column({ type: "varchar", unique: true })
  email!: string;

  @Column({ type: "varchar", name: "password_hash" })
  passwordHash!: string;

  @Column({
    type: "enum",
    enum: UserRole,
    default: UserRole.VISITOR,
  })
  role!: UserRole;

  @Column({ type: "varchar", default: "ACTIVE" })
  status!: string;

  @OneToMany(() => NotificationEntity, (notification) => notification.user)
  notifications!: NotificationEntity[];

  constructor(
    name?: string,
    email?: string,
    passwordHash?: string,
    role?: UserRole,
  ) {
    if (name && email && passwordHash && role) {
      this.name = name;
      this.email = email;
      this.passwordHash = passwordHash;
      this.role = role;
    }
  }

  private calculatePermissions(): string[] {
    return this.role === UserRole.ADMIN
      ? ["ALL_ACCESS"]
      : ["VIEW_PUBLICATION", "INTERATIONS"];
  }

  public getAuthProfile() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      role: this.role,
      permissions: this.calculatePermissions(),
    };
  }

  public getIdentifier(): string {
    return `${this.name} (${this.role})`;
  }
}

@ChildEntity(UserRole.ADMIN)
export class AdminUserEntity extends UserEntity {
  constructor(name?: string, email?: string, passwordHash?: string) {
    super(name, email, passwordHash, UserRole.ADMIN);
  }
}

@ChildEntity(UserRole.VISITOR)
export class VisitorUserEntity extends UserEntity {
  constructor(name?: string, email?: string, passwordHash?: string) {
    super(name, email, passwordHash, UserRole.VISITOR);
  }
}
