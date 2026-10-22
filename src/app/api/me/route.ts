import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { plainText } from "@/lib/sanitize";
import { audit } from "@/server/audit";
import { requireUser, invalidatePrincipal } from "@/server/auth";
import { enforceRateLimit, ipHash, parseJson, route } from "@/server/http";
import { deleteAccount } from "@/server/services/accounts";

const profile = z
  .object({ name: z.string().trim().min(1).max(80), marketingOptIn: z.boolean() })
  .partial();

// PATCH /api/me — edit your own profile (name, marketing emails).
export const PATCH = route(async (req) => {
  const user = await requireUser();
  const input = await parseJson(req, profile);
  const updated = await db.user.update({
    where: { id: user.id },
    data: { name: input.name !== undefined ? plainText(input.name, 80) : undefined, marketingOptIn: input.marketingOptIn },
    select: { name: true, marketingOptIn: true },
  });
  await audit({ actorId: user.id, action: "user.update_profile", entityType: "User", entityId: user.id, ipHash: ipHash(req), metadata: { fields: Object.keys(input) } });
  return NextResponse.json({ user: updated });
});

// DELETE /api/me — GDPR/CCPA erasure. Requires typing the confirmation phrase.
export const DELETE = route(async (req) => {
  const user = await requireUser();
  await enforceRateLimit("login", `delete:${user.id}`);
  await parseJson(req, z.object({ confirm: z.literal("DELETE MY ACCOUNT") }));
  await deleteAccount(user.id, ipHash(req));
  await invalidatePrincipal(user.id);
  return NextResponse.json({ ok: true });
});
