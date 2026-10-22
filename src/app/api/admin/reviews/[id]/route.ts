import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/server/auth";
import { audit } from "@/server/audit";
import { ipHash, notFound, parseJson, route } from "@/server/http";
import { recomputeTraderRating } from "@/server/services/reviews";

const body = z.object({
  action: z.enum(["publish", "remove", "dismiss_reports"]),
  reason: z.string().trim().max(500).optional(),
});

// PATCH /api/admin/reviews/:id — moderate a review and resolve its reports.
export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const admin = await requireRole("ADMIN");
  const { id } = await params;
  const input = await parseJson(req, body);
  const review = await db.review.findUnique({ where: { id } });
  if (!review) throw notFound("Review");

  await db.$transaction(async (tx) => {
    if (input.action === "publish") {
      await tx.review.update({ where: { id }, data: { status: "PUBLISHED", publishedAt: review.publishedAt ?? new Date(), removedReason: null } });
    } else if (input.action === "remove") {
      await tx.review.update({ where: { id }, data: { status: "REMOVED", removedReason: input.reason ?? "Removed by moderator" } });
    }
    await tx.reviewReport.updateMany({
      where: { reviewId: id, resolvedAt: null },
      data: { resolvedAt: new Date(), resolution: input.action },
    });
    if (input.action === "dismiss_reports") await tx.review.update({ where: { id }, data: { reportCount: 0 } });
    await recomputeTraderRating(review.traderId, tx);
    await audit({ actorId: admin.id, action: `review.${input.action}`, entityType: "Review", entityId: id, ipHash: ipHash(req), metadata: { reason: input.reason } }, tx);
  });
  return NextResponse.json({ ok: true });
});
