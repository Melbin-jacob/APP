import { NextResponse } from "next/server";
import { enforceRateLimit, ipHash, route } from "@/server/http";
import { autocomplete } from "@/server/services/search";

// GET /api/search/autocomplete?q=plu
export const GET = route(async (req) => {
  await enforceRateLimit("search", ipHash(req));
  const suggestions = await autocomplete(req.nextUrl.searchParams.get("q") ?? "");
  return NextResponse.json({ suggestions }, { headers: { "Cache-Control": "public, s-maxage=300" } });
});
