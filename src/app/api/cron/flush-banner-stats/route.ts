import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { safeEqual } from "@/lib/crypto";
import { flushBannerStats } from "@/server/services/banners";
import { syncVisitorStats } from "@/server/services/visits";

// POST /api/cron/flush-banner-stats — Authorization: Bearer $CRON_SECRET
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  if (!safeEqual(auth, `Bearer ${env().CRON_SECRET}`)) {
    return NextResponse.json({ error: { code: "unauthorized" } }, { status: 401 });
  }
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const flushed = (await flushBannerStats(yesterday)) + (await flushBannerStats());
  // Same 5-minute job keeps daily visitor totals in Postgres.
  const visitorDays = await syncVisitorStats(2);
  return NextResponse.json({ flushed, visitorDays });
}
