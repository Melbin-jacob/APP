import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { audit } from "@/server/audit";
import { requireUser } from "@/server/auth";
import { notFound, route } from "@/server/http";
import { recomputeTraderRating } from "@/server/services/reviews";

// DELETE /api/me/reviews/:id — remove a review you wrote.
export const DELETE = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const user = await requireUser();
  const review = await db.review.findFirst({ where: { id: (await params).id, authorId: user.id } });
  if (!review) throw notFound("Review");
  await db.$transaction(async (tx) => {
    await tx.review.update({ where: { id: review.id }, data: { status: "REMOVED", removedReason: "Removed by its author" } });
    await recomputeTraderRating(review.traderId, tx);
  });
  await audit({ actorId: user.id, action: "review.remove_own", entityType: "Review", entityId: review.id });
  return NextResponse.json({ ok: true });
});
