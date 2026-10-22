import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";

// OWASP-recommended Argon2id parameters (m=19 MiB, t=2, p=1).
const ARGON2 = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export const hashPassword = (password: string) => hash(password, ARGON2);

export async function verifyPassword(passwordHash: string, password: string) {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

/** 256-bit URL-safe random token. */
export const randomToken = () => randomBytes(32).toString("base64url");

/** Keyed hash used to store single-use tokens; a DB leak alone can't forge links. */
export function hashToken(token: string, pepper: string) {
  return createHmac("sha256", pepper).update(token).digest("hex");
}

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Non-reversible identifier for IPs in logs/analytics (GDPR data minimisation). */
export function anonymise(value: string, salt: string) {
  return createHash("sha256").update(`${salt}:${value}`).digest("hex").slice(0, 32);
}
