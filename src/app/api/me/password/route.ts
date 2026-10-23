import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/crypto";
import { audit } from "@/server/audit";
import { invalidatePrincipal, requireUser } from "@/server/auth";
import { ApiError, enforceRateLimit, ipHash, parseJson, route } from "@/server/http";

const body = z.object({
  currentPassword: z.string().max(200).optional(),
  newPassword: z
    .string()
    .min(12)
    .max(200)
    .refine((p) => /[a-z]/i.test(p) && /\d/.test(p), "Include letters and numbers"),
});

// POST /api/me/password — change (or, for email-link / Google accounts, set) a password.
// The current password is required whenever one exists, so a hijacked session
// can't silently take over the account. Signs the account out everywhere.
export const POST = route(async (req) => {
  const user = await requireUser();
  await enforceRateLimit("login", `pw:${user.id}`);
  const input = await parseJson(req, body);
  const current = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
  if (current.passwordHash && !(input.currentPassword && (await verifyPassword(current.passwordHash, input.currentPassword)))) {
    throw new ApiError(403, "wrong_password", "Your current password is incorrect");
  }
  // New password: every existing session (including any an attacker holds) ends.
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(input.newPassword), sessionVersion: { increment: 1 } } });
  await invalidatePrincipal(user.id);
  await audit({ actorId: user.id, action: current.passwordHash ? "user.change_password" : "user.set_password", entityType: "User", entityId: user.id, ipHash: ipHash(req) });
  return NextResponse.json({ ok: true });
});
