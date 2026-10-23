import { NextResponse } from "next/server";
import { endAllSessions, requireUser } from "@/server/auth";
import { audit } from "@/server/audit";
import { ipHash, route } from "@/server/http";

// DELETE /api/me/sessions — sign out of every device, including this one.
export const DELETE = route(async (req) => {
  const user = await requireUser();
  await endAllSessions(user.id);
  await audit({ actorId: user.id, action: "user.sessions_revoke", entityType: "User", entityId: user.id, ipHash: ipHash(req) });
  return NextResponse.json({ ok: true });
});
