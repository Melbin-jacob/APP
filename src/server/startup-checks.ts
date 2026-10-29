// Refuse to run a production deployment with unsafe configuration. Pure
// function so it can be unit-tested; called once at boot from instrumentation.ts.
type Env = Record<string, string | undefined>;

const WEAK = /change-?me|local-test|example|placeholder|secret123|password/i;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function strongSecret(name: string, value: string | undefined, errors: string[]) {
  if (!value) return errors.push(`${name} is not set`);
  if (value.length < 32) errors.push(`${name} must be at least 32 characters (use: openssl rand -base64 32)`);
  if (WEAK.test(value)) errors.push(`${name} looks like a placeholder or test value`);
  if (new Set(value).size < 10) errors.push(`${name} is not random enough`);
}

export function productionConfigProblems(env: Env): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (env.NODE_ENV !== "production") return { errors, warnings };

  let appUrl: URL | null = null;
  try { appUrl = new URL(env.APP_URL ?? ""); } catch { errors.push("APP_URL is not a valid URL"); }

  if (env.ALLOW_INSECURE_LOCAL_SECRETS === "true") {
    if (appUrl && !LOCAL_HOSTS.has(appUrl.hostname)) {
      errors.push("ALLOW_INSECURE_LOCAL_SECRETS=true is only allowed when APP_URL is localhost. Remove it and set real secrets.");
    } else {
      warnings.push("Running with ALLOW_INSECURE_LOCAL_SECRETS=true (local testing only).");
    }
    return { errors, warnings };
  }

  for (const name of ["NEXTAUTH_SECRET", "REVIEW_TOKEN_PEPPER", "CRON_SECRET"]) strongSecret(name, env[name], errors);
  const secrets = [env.NEXTAUTH_SECRET, env.REVIEW_TOKEN_PEPPER, env.CRON_SECRET].filter(Boolean);
  if (new Set(secrets).size !== secrets.length) errors.push("NEXTAUTH_SECRET, REVIEW_TOKEN_PEPPER and CRON_SECRET must all be different");

  const mfaKey = env.MFA_ENCRYPTION_KEY ? Buffer.from(env.MFA_ENCRYPTION_KEY, "base64") : null;
  if (!mfaKey || mfaKey.length !== 32) errors.push("MFA_ENCRYPTION_KEY must be 32 random bytes, base64-encoded (openssl rand -base64 32)");

  if (appUrl && appUrl.protocol !== "https:") errors.push("APP_URL must use https:// in production");
  if (env.REQUIRE_ADMIN_MFA === "false") errors.push("REQUIRE_ADMIN_MFA=false is not allowed in production");
  if (env.EMAIL_TRANSPORT === "console") errors.push("EMAIL_TRANSPORT=console is not allowed in production");
  // CAN-SPAM (US) and CASL (Canada): every commercial email must carry a valid postal address.
  if (!env.LEGAL_ADDRESS?.trim()) errors.push("LEGAL_ADDRESS is not set: emails must show the company's mailing address (CAN-SPAM / CASL)");
  if (!env.LEGAL_ENTITY_NAME?.trim()) warnings.push("LEGAL_ENTITY_NAME is not set: legal pages and emails show the placeholder company name");
  // DMCA safe harbour needs a designated agent registered with the U.S. Copyright Office and named on the site.
  if (!env.DMCA_AGENT_NAME?.trim()) {
    warnings.push("DMCA_AGENT_NAME is not set: register a designated agent at https://dmca.copyright.gov and set DMCA_AGENT_NAME (and COPYRIGHT_EMAIL)");
  }

  try {
    const db = new URL(env.DATABASE_URL ?? "");
    if (!db.password || WEAK.test(db.password) || ["postgres", "admin", "root"].includes(db.password)) {
      errors.push("DATABASE_URL uses a missing or default password");
    }
    if (!/sslmode=(require|verify-ca|verify-full)/.test(db.search) && !LOCAL_HOSTS.has(db.hostname)) {
      warnings.push("DATABASE_URL has no sslmode=require: make sure the database connection is encrypted or on a private network");
    }
  } catch {
    errors.push("DATABASE_URL is not a valid URL");
  }
  if (env.REDIS_URL && !env.REDIS_URL.startsWith("rediss://") && !/@|localhost|127\.0\.0\.1/.test(env.REDIS_URL)) {
    warnings.push("REDIS_URL has no password and no TLS (rediss://): keep Redis on a private network");
  }
  return { errors, warnings };
}
