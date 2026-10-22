import { NextResponse } from "next/server";
import { route } from "@/server/http";
import { getPopularCategories } from "@/server/services/catalog";
import { getVisitor } from "@/server/visitor";

// GET /api/categories — active categories with approved-trader counts in the visitor's country.
export const GET = route(async () => {
  const { country } = await getVisitor();
  const categories = await getPopularCategories(country, 100);
  return NextResponse.json({ categories, country }, { headers: { "Cache-Control": "private, max-age=300" } });
});
