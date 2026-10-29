import { NextResponse } from "next/server";
import { z } from "zod";
import { isSupportedCountry } from "@/lib/postcode";
import { enforceRateLimit, ipHash, route } from "@/server/http";
import { suggestAddresses } from "@/server/services/address";

const coord = (max: number) => z.coerce.number().min(-max).max(max);
const Near = z.object({ lat: coord(90), lon: coord(180) });

// GET /api/geo/address?q=222+bridge&country=CA[&lat=42.3&lon=-83.0] → { suggestions }
// for the type-ahead on address fields. lat/lon bias results towards a place
// (e.g. the business being asked for a quote).
export const GET = route(async (req) => {
  await enforceRateLimit("addressSuggest", ipHash(req));
  const sp = req.nextUrl.searchParams;
  const country = (sp.get("country") ?? "").toUpperCase();
  if (!isSupportedCountry(country)) return NextResponse.json({ suggestions: [] });
  const near = Near.safeParse({ lat: sp.get("lat") ?? undefined, lon: sp.get("lon") ?? undefined });
  const suggestions = await suggestAddresses(sp.get("q") ?? "", country, near.success ? { latitude: near.data.lat, longitude: near.data.lon } : null);
  return NextResponse.json({ suggestions }, { headers: { "Cache-Control": "private, max-age=3600" } });
});
