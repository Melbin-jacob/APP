import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { plainText } from "@/lib/sanitize";
import { getPrincipal } from "@/server/auth";
import { enforceRateLimit, ipHash, notFound, parseJson, route } from "@/server/http";
import { recomputeTraderRating } from "@/server/services/reviews";
import { getSetting } from "@/server/settings";

const body = z.object({
  reason: z.enum(["SPAM", "OFFENSIVE", "FAKE", "CONFLICT_OF_INTEREST", "OTHER"]),
  details: z.string().max(1000).optional(),
});

// POST /api/reviews/:id/report — public "report this review". Past the
// configured threshold the review is pulled into moderation automatically.
export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  await enforceRateLimit("reviewReport", ipHash(req));
  const { id } = await params;
  const input = await parseJson(req, body);
  const user = await getPrincipal();
  const threshold = await getSetting("reviews.reportThreshold");

  const review = await db.review.findUnique({ where: { id }, select: { id: true, traderId: true, status: true } });
  if (!review || review.status === "REMOVED") throw notFound("Review");

  await db.$transaction(async (tx) => {
    await tx.reviewReport.create({
      data: { reviewId: id, reporterId: user?.id, reason: input.reason, details: input.details ? plainText(input.details, 1000) : null },
    });
    const updated = await tx.review.update({ where: { id }, data: { reportCount: { increment: 1 } } });
    if (updated.status === "PUBLISHED" && updated.reportCount >= threshold) {
      await tx.review.update({ where: { id }, data: { status: "PENDING_MODERATION" } });
      await recomputeTraderRating(review.traderId, tx);
    }
  });
  return NextResponse.json({ ok: true }, { status: 202 });
});
