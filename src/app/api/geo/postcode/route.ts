import { NextResponse } from "next/server";
import { ApiError, enforceRateLimit, ipHash, route } from "@/server/http";
import { parsePostcode } from "@/lib/postcode";
import { lookupPostcode } from "@/server/services/geo";

// GET /api/geo/postcode?code=SW1A1AA → { location } for the sign-up form.
export const GET = route(async (req) => {
  await enforceRateLimit("geoLookup", ipHash(req));
  const code = req.nextUrl.searchParams.get("code") ?? "";
  if (!parsePostcode(code)) {
    throw new ApiError(422, "invalid_postcode", "Enter a full UK postcode (e.g. SW1A 1AA) or a 5-digit US ZIP code.");
  }
  const location = await lookupPostcode(code);
  if (!location) throw new ApiError(404, "postcode_not_found", "We couldn't find that postcode. Check it and try again.");
  return NextResponse.json({ location }, { headers: { "Cache-Control": "private, max-age=3600" } });
});
