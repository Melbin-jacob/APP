import { NextResponse } from "next/server";
import { route } from "@/server/http";
import { getSideBanners } from "@/server/services/banners";

// GET /api/banners — current side banners for client-side refresh; {} when disabled.
export const GET = route(async () => {
  const banners = await getSideBanners();
  return NextResponse.json({ banners }, { headers: { "Cache-Control": "no-store" } });
});
