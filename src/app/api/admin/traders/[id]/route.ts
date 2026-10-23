import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/server/auth";
import { audit } from "@/server/audit";
import { ipHash, notFound, parseJson, route } from "@/server/http";
import { invalidateTrader } from "@/server/services/traders";

const body = z.object({
  status: z.enum(["APPROVED", "SUSPENDED", "REJECTED"]),
  reason: z.string().trim().max(500).optional(),
});

// PATCH /api/admin/traders/:id — approve / suspend / reject a listing.
export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const admin = await requireRole("ADMIN");
  const { id } = await params;
  const input = await parseJson(req, body);
  const trader = await db.traderProfile.findUnique({ where: { id }, select: { slug: true, status: true } });
  if (!trader) throw notFound("Trader");
  await db.$transaction(async (tx) => {
    await tx.traderProfile.update({
      where: { id },
      data: { status: input.status, verifiedAt: input.status === "APPROVED" ? new Date() : undefined },
    });
    await audit({
      actorId: admin.id, action: `trader.${input.status.toLowerCase()}`, entityType: "TraderProfile", entityId: id,
      ipHash: ipHash(req), metadata: { from: trader.status, reason: input.reason },
    }, tx);
  });
  await invalidateTrader(trader.slug);
  return NextResponse.json({ ok: true });
});
