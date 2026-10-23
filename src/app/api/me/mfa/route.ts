import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPassword } from "@/lib/crypto";
import { db } from "@/lib/db";
import { adminMfaRequired, invalidatePrincipal, requireUser } from "@/server/auth";
import { audit } from "@/server/audit";
import { ApiError, enforceRateLimit, ipHash, parseJson, route } from "@/server/http";
import { disableMfa, mfaStatus, verifyMfaCode } from "@/server/services/mfa";
import { securityAlert } from "@/server/services/security-alerts";

// GET /api/me/mfa — is two-step sign-in on, and how many recovery codes are left.
export const GET = route(async () => {
  const user = await requireUser();
  return NextResponse.json(await mfaStatus(user.id));
});

// DELETE /api/me/mfa { password, code } — turn two-step sign-in off (not allowed for staff).
export const DELETE = route(async (req) => {
  const user = await requireUser();
  await enforceRateLimit("login", `mfa:${user.id}`);
  const { password, code } = await parseJson(req, z.object({ password: z.string().min(1).max(200), code: z.string().min(6).max(20) }));
  if ((user.role === "ADMIN" || user.role === "SUPER_ADMIN") && adminMfaRequired()) {
    throw new ApiError(403, "mfa_required_for_staff", "Staff accounts must keep two-step sign-in on");
  }
  const row = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
  if (!row.passwordHash || !(await verifyPassword(row.passwordHash, password)) || !(await verifyMfaCode(user.id, code))) {
    throw new ApiError(400, "wrong_credentials", "That password or code isn't right");
  }
  await disableMfa(user.id);
  await invalidatePrincipal(user.id);
  await audit({ actorId: user.id, action: "user.mfa_disable", entityType: "User", entityId: user.id, ipHash: ipHash(req) });
  if (user.role === "TRADER") void securityAlert("mfa_disabled", "A business account turned off two-step sign-in", { userId: user.id }, { key: user.id });
  return NextResponse.json({ ok: true });
});
