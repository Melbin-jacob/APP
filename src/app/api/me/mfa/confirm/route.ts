import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidatePrincipal, requireUser } from "@/server/auth";
import { audit } from "@/server/audit";
import { ApiError, enforceRateLimit, ipHash, parseJson, route } from "@/server/http";
import { confirmMfaSetup } from "@/server/services/mfa";

// POST /api/me/mfa/confirm { code } — turns two-step sign-in on; returns recovery codes once.
export const POST = route(async (req) => {
  const user = await requireUser();
  await enforceRateLimit("login", `mfa-confirm:${user.id}`);
  const { code } = await parseJson(req, z.object({ code: z.string().min(6).max(10) }));
  const result = await confirmMfaSetup(user.id, code);
  if (!result.ok) {
    throw result.reason === "expired"
      ? new ApiError(410, "setup_expired", "Setup timed out. Please start again.")
      : new ApiError(400, "invalid_code", "That code isn't right. Check the time on your phone and try the newest code.");
  }
  await invalidatePrincipal(user.id);
  await audit({ actorId: user.id, action: "user.mfa_enable", entityType: "User", entityId: user.id, ipHash: ipHash(req) });
  return NextResponse.json({ recoveryCodes: result.recoveryCodes });
});
