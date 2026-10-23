import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "./env";

// AES-256-GCM for small secrets we must be able to read back (two-step
// sign-in seeds). Format: v1.<iv>.<tag>.<ciphertext>, base64url.
function key(): Buffer {
  const { MFA_ENCRYPTION_KEY, NEXTAUTH_SECRET } = env();
  if (MFA_ENCRYPTION_KEY) {
    const k = Buffer.from(MFA_ENCRYPTION_KEY, "base64");
    if (k.length !== 32) throw new Error("MFA_ENCRYPTION_KEY must be 32 bytes, base64-encoded");
    return k;
  }
  // Development fallback only; production startup refuses to run without a real key.
  return createHash("sha256").update(`mfa-key:${NEXTAUTH_SECRET}`).digest();
}

export function seal(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ct.toString("base64url")].join(".");
}

export function open(sealed: string): string {
  const [v, iv, tag, ct] = sealed.split(".");
  if (v !== "v1" || !iv || !tag || !ct) throw new Error("Unrecognised sealed value");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ct, "base64url")), decipher.final()]).toString("utf8");
}
