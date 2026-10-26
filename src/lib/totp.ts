import { createHmac, randomBytes, randomInt } from "node:crypto";

// RFC 6238 time-based one-time passwords (SHA-1, 30 s, 6 digits): what
// Google Authenticator, Microsoft Authenticator, 1Password, Authy etc. use.
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;

export function base32Encode(buf: Buffer): string {
  let bits = 0, value = 0, out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | ALPHABET.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** 160-bit secret, base32 (the form authenticator apps expect). */
export const generateTotpSecret = () => base32Encode(randomBytes(20));

export const currentStep = (now = Date.now()) => Math.floor(now / 1000 / STEP_SECONDS);

export function totpAt(secret: string, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const mac = createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const offset = mac[mac.length - 1]! & 0x0f;
  const code = (mac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return code.toString().padStart(6, "0");
}

/**
 * Checks a code against the current step ±1 (clock drift). Returns the matched
 * step, or null. Pass the last accepted step to refuse replays of a used code.
 */
export function verifyTotp(secret: string, code: string, lastStep?: number | null, now = Date.now()): number | null {
  const clean = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean)) return null;
  const step = currentStep(now);
  for (const s of [step - 1, step, step + 1]) {
    if (lastStep != null && s <= lastStep) continue;
    if (totpAt(secret, s) === clean) return s;
  }
  return null;
}

export function otpauthUrl(secret: string, account: string, issuer = "GetTradePros") {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=${STEP_SECONDS}`;
}

/** Ten one-time recovery codes like "7KQ2-M9XD" (40 bits each). */
export function generateRecoveryCodes(n = 10): string[] {
  const pick = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(32)]).join("");
  return Array.from({ length: n }, () => `${pick()}-${pick()}`);
}

export const normaliseRecoveryCode = (code: string) => code.toUpperCase().replace(/[^A-Z2-7]/g, "");
