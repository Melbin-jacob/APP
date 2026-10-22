import { NextResponse } from "next/server";
import { COUNTRIES, isSupportedCountry, parsePostcode } from "@/lib/postcode";
import { ApiError, enforceRateLimit, ipHash, route } from "@/server/http";
import { lookupPostcode } from "@/server/services/geo";

// GET /api/geo/postcode?country=CA&code=M5V3L9 → { location } for the sign-up form.
export const GET = route(async (req) => {
  await enforceRateLimit("geoLookup", ipHash(req));
  const country = (req.nextUrl.searchParams.get("country") ?? "").toUpperCase();
  const code = req.nextUrl.searchParams.get("code") ?? "";
  if (!isSupportedCountry(country)) throw new ApiError(422, "unsupported_country", "We're not open for businesses in that country yet.");
  const rule = COUNTRIES[country];
  if (!parsePostcode(country, code)) throw new ApiError(422, "invalid_postcode", rule.formatHint);
  const location = await lookupPostcode(country, code);
  if (!location) {
    throw new ApiError(404, "postcode_not_found", `We couldn't find that ${rule.postalLabel.toLowerCase()}. Check it and try again.`);
  }
  return NextResponse.json({ location }, { headers: { "Cache-Control": "private, max-age=3600" } });
});
