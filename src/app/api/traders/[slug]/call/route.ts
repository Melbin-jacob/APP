import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enforceRateLimit, ipHash, notFound, route } from "@/server/http";

// POST /api/traders/:slug/call — records a click-to-call and reveals the
// dialable number (tracking/masked number when provisioned). Keeping the real
// number out of the HTML also blunts scraping.
export const POST = route<{ params: Promise<{ slug: string }> }>(async (req, { params }) => {
  const visitor = ipHash(req);
  await enforceRateLimit("callClick", visitor);
  const trader = await db.traderProfile.findFirst({
    where: { slug: (await params).slug, status: "APPROVED" },
    select: { id: true, phone: true, trackingPhone: true },
  });
  if (!trader || !trader.phone) throw notFound("Trader");
  await db.callEvent.create({ data: { traderId: trader.id, visitorHash: visitor } });
  const number = trader.trackingPhone ?? trader.phone;
  return NextResponse.json({ tel: `tel:${number.replace(/[^+\d]/g, "")}`, display: number });
});
