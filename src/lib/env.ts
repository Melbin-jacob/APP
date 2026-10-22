import { z } from "zod";

// Fail fast at boot on a misconfigured deployment instead of at first request.
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  APP_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  EMAIL_TRANSPORT: z.enum(["ses", "smtp", "console"]).default("console"),
  EMAIL_FROM: z.string().min(3),
  AWS_REGION: z.string().optional(),
  SMTP_URL: z.string().optional(),
  REVIEW_TOKEN_PEPPER: z.string().min(32),
  REVIEW_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(14),
  CRON_SECRET: z.string().min(32),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function env(): Env {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(`Invalid environment: ${parsed.error.issues.map((i) => i.path.join(".")).join(", ")}`);
    }
    if (parsed.data.NODE_ENV === "production" && parsed.data.EMAIL_TRANSPORT === "console") {
      throw new Error("EMAIL_TRANSPORT=console is not allowed in production");
    }
    cached = parsed.data;
  }
  return cached;
}
