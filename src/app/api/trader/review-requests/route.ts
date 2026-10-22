import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/server/auth";
import { enforceRateLimit, notFound, parseJson, route } from "@/server/http";
import { createReviewRequest, reviewRequestInput } from "@/server/services/reviews";

// POST /api/trader/review-requests — ad-hoc "ask a customer for a review".
export const POST = route(async (req) => {
  const user = await requireRole("TRADER");
  const trader = await db.traderProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!trader) throw notFound("Trader profile");
  await enforceRateLimit("reviewRequest", trader.id);
  const input = await parseJson(req, reviewRequestInput);
  const result = await createReviewRequest(trader.id, input, user.id);
  return NextResponse.json(result, { status: 201 });
});

// GET /api/trader/review-requests — delivery status for the trader's dashboard.
export const GET = route(async () => {
  const user = await requireRole("TRADER");
  const requests = await db.reviewRequest.findMany({
    where: { trader: { userId: user.id } },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, customerEmail: true, customerName: true, status: true, sentAt: true, usedAt: true, expiresAt: true },
  });
  return NextResponse.json({ requests });
});
