import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { audit } from "@/server/audit";
import { enforceRateLimit, ipHash, route } from "@/server/http";
import { exportUserData } from "@/server/services/accounts";

// GET /api/me/export — downloadable JSON of all personal data (portability).
export const GET = route(async (req) => {
  const user = await requireUser();
  await enforceRateLimit("register", `export:${user.id}`);
  const data = await exportUserData(user.id);
  await audit({ actorId: user.id, action: "user.export", entityType: "User", entityId: user.id, ipHash: ipHash(req) });
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="homeservices-export-${user.id}.json"`,
      "Cache-Control": "no-store",
    },
  });
});
