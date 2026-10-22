import { NextResponse } from "next/server";
import { route } from "@/server/http";
import { getPopularCategories } from "@/server/services/catalog";

// GET /api/categories — active categories with approved-trader counts.
export const GET = route(async () => {
  const categories = await getPopularCategories(100);
  return NextResponse.json({ categories }, { headers: { "Cache-Control": "public, s-maxage=300" } });
});
