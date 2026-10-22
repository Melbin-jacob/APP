import { NextResponse } from "next/server";
import { z } from "zod";
import { isCurrency } from "@/lib/currency";
import { isSupportedCountry } from "@/lib/postcode";
import { isLocale } from "@/i18n/locales";
import { parseJson, route } from "@/server/http";
import { PREF_COOKIES } from "@/server/visitor";

const body = z
  .object({
    country: z.string().toUpperCase().refine(isSupportedCountry),
    locale: z.string().refine(isLocale),
    currency: z.string().toUpperCase().refine(isCurrency),
  })
  .partial();

// POST /api/preferences { country?, locale?, currency? } — remembers the
// visitor's choices for a year. Overrides location-based defaults.
export const POST = route(async (req) => {
  const input = await parseJson(req, body);
  const res = NextResponse.json({ ok: true });
  for (const key of ["country", "locale", "currency"] as const) {
    const value = input[key];
    if (value) {
      res.cookies.set(PREF_COOKIES[key], value, {
        path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", secure: process.env.NODE_ENV === "production" && req.nextUrl.protocol === "https:",
      });
    }
  }
  return res;
});
