import { NextResponse } from "next/server";
import { getI18n } from "@/i18n/server";
import { enforceRateLimit, ipHash, route } from "@/server/http";
import { autocomplete } from "@/server/services/search";

// GET /api/search/autocomplete?q=plu — categories in the visitor's language,
// businesses in the visitor's country.
export const GET = route(async (req) => {
  await enforceRateLimit("search", ipHash(req));
  const { t, visitor } = await getI18n();
  const suggestions = await autocomplete(req.nextUrl.searchParams.get("q") ?? "", visitor.country, (slug, fallback) =>
    t.maybe(`categories.names.${slug}`, fallback),
  );
  return NextResponse.json({ suggestions }, { headers: { "Cache-Control": "private, max-age=300" } });
});
