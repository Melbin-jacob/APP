import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { invalidate } from "@/lib/redis";
import { requireRole } from "@/server/auth";
import { audit } from "@/server/audit";
import { ipHash, notFound, parseJson, route } from "@/server/http";

const patch = z.object({
  name: z.string().trim().min(1).max(100),
  isActive: z.boolean(),
  weight: z.number().int().min(1).max(100),
  startsAt: z.coerce.date().nullable(),
  endsAt: z.coerce.date().nullable(),
}).partial();

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/admin/banners/:id — toggle / reschedule / reweight.
export const PATCH = route<Ctx>(async (req, { params }) => {
  const admin = await requireRole("SUPER_ADMIN");
  const { id } = await params;
  const input = await parseJson(req, patch);
  if (!(await db.banner.findUnique({ where: { id }, select: { id: true } }))) throw notFound("Banner");
  await db.banner.update({ where: { id }, data: input });
  await audit({ actorId: admin.id, action: "banner.update", entityType: "Banner", entityId: id, ipHash: ipHash(req), metadata: input });
  await invalidate("banners:active");
  return NextResponse.json({ ok: true });
});

// DELETE /api/admin/banners/:id
export const DELETE = route<Ctx>(async (req, { params }) => {
  const admin = await requireRole("SUPER_ADMIN");
  const { id } = await params;
  await db.banner.delete({ where: { id } }).catch(() => { throw notFound("Banner"); });
  await audit({ actorId: admin.id, action: "banner.delete", entityType: "Banner", entityId: id, ipHash: ipHash(req) });
  await invalidate("banners:active");
  return NextResponse.json({ ok: true });
});
