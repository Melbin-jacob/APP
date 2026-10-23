import QRCode from "qrcode";
import { hashPassword, verifyPassword } from "@/lib/crypto";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { open, seal } from "@/lib/secret-box";
import { generateRecoveryCodes, generateTotpSecret, normaliseRecoveryCode, otpauthUrl, verifyTotp } from "@/lib/totp";

const PENDING_TTL = 15 * 60;
const pendingKey = (userId: string) => `mfa:pending:${userId}`;

/** Step 1 of setup: a new secret (kept server-side, sealed, for 15 minutes) and its QR code. */
export async function beginMfaSetup(userId: string, email: string) {
  const secret = generateTotpSecret();
  await redis.set(pendingKey(userId), seal(secret), "EX", PENDING_TTL);
  const url = otpauthUrl(secret, email);
  return { qr: await QRCode.toDataURL(url, { margin: 1, width: 220 }), secret, url };
}

/**
 * Step 2: the user proves their app works by entering a code. Turns MFA on,
 * returns recovery codes (shown once; only hashes are kept) and signs the
 * account out everywhere so every session from now on has passed two steps.
 */
export async function confirmMfaSetup(userId: string, code: string) {
  const sealed = await redis.get(pendingKey(userId));
  if (!sealed) return { ok: false as const, reason: "expired" as const };
  const secret = open(sealed);
  const step = verifyTotp(secret, code);
  if (step === null) return { ok: false as const, reason: "invalid" as const };
  const recoveryCodes = generateRecoveryCodes();
  await db.user.update({
    where: { id: userId },
    data: {
      mfaSecret: seal(secret),
      mfaEnabledAt: new Date(),
      mfaLastStep: step,
      mfaRecoveryCodes: await Promise.all(recoveryCodes.map((c) => hashPassword(normaliseRecoveryCode(c)))),
      sessionVersion: { increment: 1 },
    },
  });
  await redis.del(pendingKey(userId));
  return { ok: true as const, recoveryCodes };
}

/**
 * Checks a 6-digit app code or a recovery code. App codes can't be replayed
 * (the accepted time step is stored atomically); a recovery code works once.
 */
export async function verifyMfaCode(userId: string, input: string): Promise<"totp" | "recovery" | null> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { mfaSecret: true, mfaLastStep: true, mfaRecoveryCodes: true } });
  if (!user?.mfaSecret) return null;
  const digits = input.replace(/\s/g, "");
  if (/^\d{6}$/.test(digits)) {
    const step = verifyTotp(open(user.mfaSecret), digits, user.mfaLastStep);
    if (step === null) return null;
    // Conditional update: two concurrent logins with the same code can't both win.
    const claimed = await db.user.updateMany({
      where: { id: userId, OR: [{ mfaLastStep: null }, { mfaLastStep: { lt: step } }] },
      data: { mfaLastStep: step },
    });
    return claimed.count === 1 ? "totp" : null;
  }
  const normalised = normaliseRecoveryCode(input);
  if (normalised.length !== 8) return null;
  for (const hashed of user.mfaRecoveryCodes) {
    if (await verifyPassword(hashed, normalised)) {
      await db.user.update({ where: { id: userId }, data: { mfaRecoveryCodes: user.mfaRecoveryCodes.filter((h) => h !== hashed) } });
      return "recovery";
    }
  }
  return null;
}

export async function regenerateRecoveryCodes(userId: string) {
  const codes = generateRecoveryCodes();
  await db.user.update({ where: { id: userId }, data: { mfaRecoveryCodes: await Promise.all(codes.map((c) => hashPassword(normaliseRecoveryCode(c)))) } });
  return codes;
}

/** Turns two-step sign-in off and signs the account out everywhere. */
export async function disableMfa(userId: string) {
  await db.user.update({
    where: { id: userId },
    data: { mfaSecret: null, mfaEnabledAt: null, mfaLastStep: null, mfaRecoveryCodes: [], sessionVersion: { increment: 1 } },
  });
}

export async function mfaStatus(userId: string) {
  const u = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { mfaEnabledAt: true, mfaRecoveryCodes: true } });
  return { enabled: !!u.mfaEnabledAt, enabledAt: u.mfaEnabledAt, recoveryCodesLeft: u.mfaRecoveryCodes.length };
}
