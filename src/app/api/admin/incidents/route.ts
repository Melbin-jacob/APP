import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRecentAuth, requireRole } from "@/server/auth";
import { audit } from "@/server/audit";
import { ipHash, parseJson, route } from "@/server/http";
import { cleanIncident, incidentFields } from "@/server/services/incidents";

// GET /api/admin/incidents — the security incident / breach register.
export const GET = route(async () => {
  await requireRole("SUPER_ADMIN");
  const incidents = await db.securityIncident.findMany({ orderBy: { detectedAt: "desc" }, take: 200 });
  return NextResponse.json({ incidents });
});

// POST /api/admin/incidents — record a new incident (every breach, reported or not).
export const POST = route(async (req) => {
  const admin = await requireRole("SUPER_ADMIN");
  const input = cleanIncident(await parseJson(req, incidentFields));
  await requireRecentAuth(admin);
  const incident = await db.securityIncident.create({ data: { ...input, createdById: admin.id } });
  await audit({ actorId: admin.id, action: "incident.create", entityType: "SecurityIncident", entityId: incident.id, ipHash: ipHash(req), metadata: { title: input.title } });
  return NextResponse.json({ incident }, { status: 201 });
});
