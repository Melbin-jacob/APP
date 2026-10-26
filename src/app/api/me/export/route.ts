import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { audit } from "@/server/audit";
import { enforceRateLimit, ipHash, route } from "@/server/http";
import { exportUserData } from "@/server/services/accounts";
import { crossedThreshold, securityAlert } from "@/server/services/security-alerts";

// GET /api/me/export — downloadable JSON of all personal data (portability).
export const GET = route(async (req) => {
  const user = await requireUser();
  await enforceRateLimit("register", `export:${user.id}`);
  const data = await exportUserData(user.id);
  await audit({ actorId: user.id, action: "user.export", entityType: "User", entityId: user.id, ipHash: ipHash(req) });
  // Many exports in a short time can mean compromised accounts being harvested.
  if (await crossedThreshold("data_export", 25, 60 * 60)) {
    void securityAlert("export_spike", "Unusual number of personal-data exports", { threshold: "25 in an hour", lastUserId: user.id });
  }
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="gettradepros-export-${user.id}.json"`,
      "Cache-Control": "no-store",
    },
  });
});
