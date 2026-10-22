import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/server/auth";
import { enforceRateLimit, notFound, route } from "@/server/http";
import { completeJob } from "@/server/services/reviews";

// POST /api/trader/jobs/:id/complete — marks the job done and emails the
// customer a single-use review link.
export const POST = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const user = await requireRole("TRADER");
  const trader = await db.traderProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!trader) throw notFound("Trader profile");
  await enforceRateLimit("reviewRequest", trader.id);
  const result = await completeJob(trader.id, (await params).id, user.id);
  return NextResponse.json(result, { status: 201 });
});
