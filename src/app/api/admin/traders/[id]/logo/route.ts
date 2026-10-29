import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/server/audit";
import { requireRole } from "@/server/auth";
import { ipHash, notFound, parseJson, route } from "@/server/http";
import { removeLogo } from "@/server/services/media";
import { invalidateTrader } from "@/server/services/traders";

// DELETE /api/admin/traders/:id/logo { reason } — takedown of a business's
// logo, e.g. after a copyright notice (see /legal/copyright).
export const DELETE = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const admin = await requireRole("ADMIN");
  const { reason } = await parseJson(req, z.object({ reason: z.string().trim().min(3).max(500) }));
  const trader = await db.traderProfile.findUnique({ where: { id: (await params).id }, select: { id: true, slug: true, logoUrl: true } });
  if (!trader) throw notFound("Business");
  if (trader.logoUrl) {
    await removeLogo(trader.id, trader.logoUrl);
    await invalidateTrader(trader.slug);
  }
  await audit({ actorId: admin.id, action: "trader.logo.remove", entityType: "TraderProfile", entityId: trader.id, ipHash: ipHash(req), metadata: { reason } });
  return NextResponse.json({ ok: true });
});
