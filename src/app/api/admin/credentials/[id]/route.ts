import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { invalidate } from "@/lib/redis";
import { requireRole } from "@/server/auth";
import { audit } from "@/server/audit";
import { ipHash, notFound, parseJson, route } from "@/server/http";

const body = z.object({ status: z.enum(["VERIFIED", "REJECTED"]), note: z.string().max(500).optional() });

// PATCH /api/admin/credentials/:id — verify a licence / certification / insurance.
export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const admin = await requireRole("ADMIN");
  const { id } = await params;
  const input = await parseJson(req, body);
  const cred = await db.credential.findUnique({ where: { id }, include: { trader: { select: { slug: true } } } });
  if (!cred) throw notFound("Credential");
  await db.$transaction(async (tx) => {
    await tx.credential.update({ where: { id }, data: { status: input.status, reviewedById: admin.id, reviewedAt: new Date() } });
    await audit({ actorId: admin.id, action: `credential.${input.status.toLowerCase()}`, entityType: "Credential", entityId: id, ipHash: ipHash(req), metadata: { note: input.note } }, tx);
  });
  await invalidate(`trader:${cred.trader.slug}`);
  return NextResponse.json({ ok: true });
});
