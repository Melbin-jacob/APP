import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { isSupportedCountry } from "@/lib/postcode";
import { audit } from "@/server/audit";
import { requireRole } from "@/server/auth";
import { ApiError, parseJson, route } from "@/server/http";
import { lookupPostcode } from "@/server/services/geo";
import { invalidateTrader, myTraderProfile } from "@/server/services/traders";

// PUT /api/trader/location { postcode } — moves the business within its own
// country. Coordinates come only from the server-side lookup, as at sign-up.
export const PUT = route(async (req) => {
  const user = await requireRole("TRADER");
  const trader = await myTraderProfile(user.id);
  const { postcode } = await parseJson(req, z.object({ postcode: z.string().trim().min(3).max(12) }));
  if (!isSupportedCountry(trader.country)) throw new ApiError(422, "unsupported_country", "Your country isn't supported yet");
  const place = await lookupPostcode(trader.country, postcode);
  if (!place) throw new ApiError(422, "postcode_not_found", "We couldn't find that postal code");
  const updated = await db.traderProfile.update({
    where: { id: trader.id },
    data: { postcode: place.postcode, city: place.city, latitude: place.latitude, longitude: place.longitude },
    select: { postcode: true, city: true },
  });
  await audit({ actorId: user.id, action: "trader.update_location", entityType: "TraderProfile", entityId: trader.id, metadata: { postcode: place.postcode } });
  await invalidateTrader(trader.slug);
  return NextResponse.json({ location: { ...updated, region: place.region } });
});
