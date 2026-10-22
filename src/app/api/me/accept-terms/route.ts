import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { TOS_VERSION } from "@/lib/legal";
import { audit } from "@/server/audit";
import { invalidatePrincipal, requireUser } from "@/server/auth";
import { ipHash, parseJson, route } from "@/server/http";

// POST /api/me/accept-terms { acceptTerms: true, version } — records explicit
// acceptance of the current Terms (and the liability disclaimer) for users
// who signed up without the registration form or whose version is outdated.
export const POST = route(async (req) => {
  const user = await requireUser();
  const input = await parseJson(req, z.object({ acceptTerms: z.literal(true), version: z.literal(TOS_VERSION) }));
  await db.user.update({ where: { id: user.id }, data: { tosVersion: input.version, tosAcceptedAt: new Date() } });
  await audit({ actorId: user.id, action: "user.accept_terms", entityType: "User", entityId: user.id, ipHash: ipHash(req), metadata: { tosVersion: input.version } });
  await invalidatePrincipal(user.id);
  return NextResponse.json({ ok: true });
});
