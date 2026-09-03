export class EmailError extends Error {
  constructor(message: string = "Invalid email format") {
    super(message);
    this.name = "EmailError";
  }

  static verifyFormat(email: string): void {
    const regex = new RegExp("^[a-z0-9._-]+@[a-z0-9.-]+\\.[a-z]{2,63}$", "i");

    if (!regex.test(email)) {
      throw new EmailError(`The email "${email}" is not in a valid format.`);
    }
  }
}
