import { UserRole } from "./Enums";

export interface IUser<T = UserRole> {
  name: string;
  email: string;
  passwordHash: string;
  role: T;
}

export type RegisterDTO = Omit<IUser<UserRole>, "passwordHash"> & {
  passwordPlain: string;
};

export type LoginDTO = Pick<IUser<UserRole>, "email"> & {
  passwordPlain: string;
  secureLoginToken?: string;
};

export class User implements IUser<UserRole> {
  constructor(
    public readonly id: string,
    public name: string,
    public email: string,
    public passwordHash: string,
    public role: UserRole,
  ) {}

  static create(data: RegisterDTO, id: string, hashedPw: string): User {
    return new User(id, data.name, data.email, hashedPw, data.role);
  }

  public getAuthProfile() {
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      permissions: this.calculatePermissions(),
    };
  }

  private calculatePermissions(): string[] {
    return this.role === UserRole.ADMIN
      ? ["ALL_ACCESS"]
      : ["VIEW_PUBLICATION", "INTERATIONS"];
  }
}
