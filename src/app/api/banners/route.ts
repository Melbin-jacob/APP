import { NextResponse } from "next/server";
import { route } from "@/server/http";
import { getBanners } from "@/server/services/banners";

// GET /api/banners — current banners per slot for client-side refresh; {} when disabled.
export const GET = route(async () => {
  const banners = await getBanners();
  return NextResponse.json({ banners }, { headers: { "Cache-Control": "no-store" } });
});
