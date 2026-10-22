import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enforceRateLimit, ipHash, route } from "@/server/http";
import { searchQuerySchema, searchTraders } from "@/server/services/search";

// GET /api/search?q=&category=&location=&lat=&lng=&radiusKm=&sort=&page=
export const GET = route(async (req) => {
  await enforceRateLimit("search", ipHash(req));
  const query = searchQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  const result = await searchTraders(query);
  // Fire-and-forget analytics for the admin "daily searches" chart.
  if (query.q || query.location) {
    db.searchQuery
      .create({ data: { keyword: query.q, location: query.location, resultCount: result.total } })
      .catch(() => {});
  }
  return NextResponse.json(
    { ...result, page: query.page, pageSize: query.pageSize },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } },
  );
});
