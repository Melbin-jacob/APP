import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enforceRateLimit, ipHash, route } from "@/server/http";
import { searchQuerySchema, searchTraders } from "@/server/services/search";
import { getVisitor } from "@/server/visitor";

// GET /api/search?q=&category=&location=&lat=&lng=&radiusKm=&sort=&page=
// Results are limited to the visitor's country (location or chosen region).
export const GET = route(async (req) => {
  await enforceRateLimit("search", ipHash(req));
  const query = searchQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  const { country } = await getVisitor();
  const result = await searchTraders(query, country);
  // Fire-and-forget analytics for the admin "daily searches" chart.
  if (query.q || query.location) {
    db.searchQuery
      .create({ data: { keyword: query.q, location: query.location, resultCount: result.total } })
      .catch(() => {});
  }
  // Varies by visitor country, so only the browser may cache it.
  return NextResponse.json(
    { ...result, page: query.page, pageSize: query.pageSize, country },
    { headers: { "Cache-Control": "private, max-age=30" } },
  );
});
