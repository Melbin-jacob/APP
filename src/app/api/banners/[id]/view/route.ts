import { NextResponse } from "next/server";
import { enforceRateLimit, ipHash, route } from "@/server/http";
import { recordBannerImpression } from "@/server/services/banners";

// POST /api/banners/:id/view — the banner was on screen (see <AdSlot>).
export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  await enforceRateLimit("bannerView", ipHash(req));
  await recordBannerImpression((await params).id);
  return new NextResponse(null, { status: 204 });
});
