import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { audit } from "@/server/audit";
import { ApiError, enforceRateLimit, ipHash, parseJson, route } from "@/server/http";
import { regenerateRecoveryCodes, verifyMfaCode } from "@/server/services/mfa";

// POST /api/me/mfa/recovery-codes { code } — new set of recovery codes (old ones stop working).
export const POST = route(async (req) => {
  const user = await requireUser();
  await enforceRateLimit("login", `mfa:${user.id}`);
  const { code } = await parseJson(req, z.object({ code: z.string().min(6).max(20) }));
  if (!(await verifyMfaCode(user.id, code))) throw new ApiError(400, "invalid_code", "That code isn't right");
  const codes = await regenerateRecoveryCodes(user.id);
  await audit({ actorId: user.id, action: "user.mfa_recovery_codes", entityType: "User", entityId: user.id, ipHash: ipHash(req) });
  return NextResponse.json({ recoveryCodes: codes });
});
