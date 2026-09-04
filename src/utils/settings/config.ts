import "@dotenvx/dotenvx/config";

export class AppConfig {
  private constructor(
    public readonly PORT: number,
    public readonly NODE_ENV: string,
    public readonly DATABASE_URL: string,
    public readonly JWT_SECRET: string,
    public readonly ACCESS_TOKEN_EXPIRATION_SECONDS: number,
    public readonly REFRESH_TOKEN_EXPIRATION_DAYS: number,
    public readonly EMAIL_USER: string,
    public readonly EMAIL_PASS: string,
    public readonly EMAIL_HOST: string,
    public readonly EMAIL_PORT: number,
    public readonly EMAIL_SECURE: boolean,
    public readonly ABSTRACT_API_KEY: string,
    public readonly ABSTRACT_API_URL: string,
    public readonly ADMIN_PANEL_HASH: string,
    public readonly VALIDATION_DRY_RUN: boolean,
    public readonly REDIS_HOST: string,
    public readonly REDIS_PORT: number,
    public readonly APP_FRONTEND_URL: string,
    public readonly REDIS_URL?: string,
    public readonly ADMIN_EMAIL?: string,
    public readonly ADMIN_PASSWORD?: string,
  ) {}

  public static parsePort(
    portEnv: string | undefined,
    defaultPort = 3000,
  ): number {
    const portNumber = portEnv ? Number(portEnv) : NaN;
    if (isNaN(portNumber) || !portEnv) return defaultPort;
    return portNumber;
  }

  public static tokenAccess(secondToken: string | undefined): number {
    const secondNumber = secondToken ? Number(secondToken) : NaN;
    if (isNaN(secondNumber) || !secondToken) return 20 * 60;
    return secondNumber;
  }

  public static refreshDays(tokenDays: string | undefined): number {
    const tokenDnumber = tokenDays ? Number(tokenDays) : NaN;
    if (isNaN(tokenDnumber) || !tokenDays) return 7 * 24 * 60 * 60;
    return tokenDnumber;
  }

  public static parseBoolean(secureEnv: string | undefined): boolean {
    if (!secureEnv) return false;
    return secureEnv.toLowerCase() === "true";
  }

  get TEST_PG_HOST(): string {
    return process.env.TEST_PG_HOST || "";
  }
  get TEST_PG_PORT(): number {
    return AppConfig.parsePort(process.env.TEST_PG_PORT, 5432);
  }
  get TEST_PG_USER(): string {
    return process.env.TEST_PG_USER || "";
  }
  get TEST_PG_PASS(): string {
    return process.env.TEST_PG_PASS || "";
  }
  get TEST_PG_DB(): string {
    return process.env.TEST_PG_DB || "";
  }
  get TEST_REDIS_HOST(): string {
    return process.env.TEST_REDIS_HOST || "";
  }
  get TEST_REDIS_PORT(): number {
    return AppConfig.parsePort(process.env.TEST_REDIS_PORT, 6379);
  }

  public static setEnv(key: string, value: string): void {
    process.env[key] = value;
  }

  public static createConfig(): AppConfig {
    const {
      PORT,
      NODE_ENV,
      DATABASE_URL,
      JWT_SECRET,
      ACCESS_TOKEN_EXPIRATION_SECONDS,
      REFRESH_TOKEN_EXPIRATION_DAYS,
      EMAIL_USER,
      EMAIL_PASS,
      EMAIL_HOST,
      EMAIL_PORT,
      EMAIL_SECURE,
      ABSTRACT_API_KEY,
      ABSTRACT_API_URL,
      ADMIN_PANEL_HASH,
      VALIDATION_DRY_RUN,
      REDIS_HOST,
      REDIS_PORT,
      REDIS_URL,
      APP_FRONTEND_URL,
      ADMIN_EMAIL,
      ADMIN_PASSWORD,
    } = process.env;

    const nodeEnv = NODE_ENV ?? "";
    // FAIL-FAST (Validations)
    if (nodeEnv !== "test") {
      if (!DATABASE_URL) throw new Error("CRITICAL: DATABASE_URL is required!");
      if (!JWT_SECRET || JWT_SECRET.length < 16) throw new Error("CRITICAL: JWT_SECRET is required and must be at least 16 chars!");
      if (!ADMIN_PANEL_HASH) throw new Error("CRITICAL: ADMIN_PANEL_HASH is required!");
    }

    const portNumber = AppConfig.parsePort(PORT);
    const dbURL = DATABASE_URL ?? "";
    const jwtSCT = JWT_SECRET ?? "";
    const accessToken = AppConfig.tokenAccess(ACCESS_TOKEN_EXPIRATION_SECONDS);
    const refreshToken = AppConfig.refreshDays(REFRESH_TOKEN_EXPIRATION_DAYS);
    const UserEmail = EMAIL_USER ?? "";
    const PassEmail = EMAIL_PASS ?? "";
    const HostEmail = EMAIL_HOST ?? "smtp.gmail.com";
    const portEmail = AppConfig.parsePort(EMAIL_PORT, 587);
    const SecureEmail = AppConfig.parseBoolean(EMAIL_SECURE);
    const ApiKey = ABSTRACT_API_KEY ?? "";
    const ApiUrl = ABSTRACT_API_URL ?? "";
    const adminPanelHash = ADMIN_PANEL_HASH ?? "";

    const dryRun = VALIDATION_DRY_RUN
      ? AppConfig.parseBoolean(VALIDATION_DRY_RUN)
      : false;

    const redisHost = REDIS_HOST ?? "localhost";
    const redisPort = AppConfig.parsePort(REDIS_PORT, 6379);
    const redisUrl = REDIS_URL || undefined;
    
    // Fallback development URL if not set
    const frontendUrl = APP_FRONTEND_URL ?? "http://localhost:5500";

    return new AppConfig(
      portNumber,
      nodeEnv,
      dbURL,
      jwtSCT,
      accessToken,
      refreshToken,
      UserEmail,
      PassEmail,
      HostEmail,
      portEmail,
      SecureEmail,
      ApiKey,
      ApiUrl,
      adminPanelHash,
      dryRun,
      redisHost,
      redisPort,
      frontendUrl,
      redisUrl,
      ADMIN_EMAIL,
      ADMIN_PASSWORD,
    );
  }
}

export const config = AppConfig.createConfig();
