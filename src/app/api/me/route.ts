import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, invalidatePrincipal } from "@/server/auth";
import { enforceRateLimit, ipHash, parseJson, route } from "@/server/http";
import { deleteAccount } from "@/server/services/accounts";

// DELETE /api/me — GDPR/CCPA erasure. Requires typing the confirmation phrase.
export const DELETE = route(async (req) => {
  const user = await requireUser();
  await enforceRateLimit("login", `delete:${user.id}`);
  await parseJson(req, z.object({ confirm: z.literal("DELETE MY ACCOUNT") }));
  await deleteAccount(user.id, ipHash(req));
  await invalidatePrincipal(user.id);
  return NextResponse.json({ ok: true });
});
