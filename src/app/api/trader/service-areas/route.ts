import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { isSupportedCountry } from "@/lib/postcode";
import { audit } from "@/server/audit";
import { requireRole } from "@/server/auth";
import { ApiError, parseJson, route } from "@/server/http";
import { invalidateTrader, myTraderProfile } from "@/server/services/traders";

// Search matches extra areas on the first part of what a customer types, so
// store US ZIPs (5 digits) and Canadian forward sortation areas (e.g. "M5V").
const AREA_FORMAT: Record<string, RegExp> = {
  US: /^\d{5}$/,
  CA: /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]$/,
};

const normalise = (country: string, raw: string) => {
  const v = raw.trim().toUpperCase().replace(/\s+/g, "");
  return country === "CA" ? v.slice(0, 3) : country === "US" ? v.slice(0, 5) : v;
};

// PUT /api/trader/service-areas { postcodes: [...] } — replaces the list.
export const PUT = route(async (req) => {
  const user = await requireRole("TRADER");
  const trader = await myTraderProfile(user.id);
  const { postcodes } = await parseJson(req, z.object({ postcodes: z.array(z.string().max(10)).max(100) }));
  const format = isSupportedCountry(trader.country) ? AREA_FORMAT[trader.country] : undefined;
  const areas = [...new Set(postcodes.map((p) => normalise(trader.country, p)).filter(Boolean))];
  const bad = format ? areas.find((a) => !format.test(a)) : undefined;
  if (bad) throw new ApiError(422, "invalid_area", `"${bad}" isn't a valid area code`);

  await db.$transaction([
    db.serviceArea.deleteMany({ where: { traderId: trader.id } }),
    db.serviceArea.createMany({ data: areas.map((postcode) => ({ traderId: trader.id, postcode })) }),
  ]);
  await audit({ actorId: user.id, action: "trader.update_areas", entityType: "TraderProfile", entityId: trader.id, metadata: { count: areas.length } });
  await invalidateTrader(trader.slug);
  return NextResponse.json({ postcodes: areas });
});
