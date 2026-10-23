import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRecentAuth, requireRole } from "@/server/auth";
import { audit } from "@/server/audit";
import { ipHash, notFound, parseJson, route } from "@/server/http";
import { cleanIncident, incidentFields } from "@/server/services/incidents";

// PATCH /api/admin/incidents/:id — update the assessment, containment and notifications.
export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const admin = await requireRole("SUPER_ADMIN");
  const input = cleanIncident(await parseJson(req, incidentFields.partial()));
  await requireRecentAuth(admin);
  const id = (await params).id;
  const before = await db.securityIncident.findUnique({ where: { id } });
  if (!before) throw notFound("Incident");
  const incident = await db.securityIncident.update({ where: { id }, data: input });
  await audit({
    actorId: admin.id, action: "incident.update", entityType: "SecurityIncident", entityId: id, ipHash: ipHash(req),
    metadata: { changed: Object.keys(input), status: incident.status },
  });
  return NextResponse.json({ incident });
});
