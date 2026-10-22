import { cookies, headers } from "next/headers";
import { cache } from "react";
import { type Currency, currencyForCountry, isCurrency } from "@/lib/currency";
import { type CountryCode, SUPPORTED_COUNTRIES, isSupportedCountry } from "@/lib/postcode";
import { type Locale, isLocale, localeDir, negotiateLocale } from "@/i18n/locales";

export const PREF_COOKIES = { country: "hsd_country", locale: "hsd_locale", currency: "hsd_currency" } as const;

export type Visitor = {
  /** Market whose listings are shown. Always one we operate in. */
  country: CountryCode;
  /** Where the request appears to come from, if known (any ISO country). */
  detectedCountry: string | null;
  /** Set when the visitor is somewhere we don't operate yet and hasn't picked a market. */
  outsideMarkets: string | null;
  locale: Locale;
  dir: "ltr" | "rtl";
  currency: Currency;
};

// Country headers set by the hosting edge. Only the platform can set them
// there; on a self-hosted setup a spoofed header only changes the sender's own view.
const GEO_HEADERS = ["x-vercel-ip-country", "cloudfront-viewer-country", "cf-ipcountry", "x-country-code"];

function detectCountry(h: Headers): string | null {
  for (const name of GEO_HEADERS) {
    const v = h.get(name)?.trim().toUpperCase();
    if (v && /^[A-Z]{2}$/.test(v) && v !== "XX" && v !== "T1") return v;
  }
  // Local development / no edge geo: the browser's language region (en-CA → CA).
  // Not "en-US": it's the factory default for English almost everywhere
  // (including most Canadian computers), so it says nothing about location.
  const tag = h.get("accept-language")?.match(/^([a-z]{2,3})-([A-Z]{2})\b/i);
  if (!tag || (tag[1].toLowerCase() === "en" && tag[2].toUpperCase() === "US")) return null;
  return tag[2].toUpperCase();
}

/** Country, language and currency for this request: explicit choice (cookie) → location → defaults. */
export const getVisitor = cache(async (): Promise<Visitor> => {
  const [h, c] = await Promise.all([headers(), cookies()]);
  const detectedCountry = detectCountry(h);

  const chosenCountry = c.get(PREF_COOKIES.country)?.value?.toUpperCase();
  const country: CountryCode =
    chosenCountry && isSupportedCountry(chosenCountry) ? chosenCountry
    : detectedCountry && isSupportedCountry(detectedCountry) ? detectedCountry
    : SUPPORTED_COUNTRIES[0] ?? "US";
  const outsideMarkets = !chosenCountry && detectedCountry && !isSupportedCountry(detectedCountry) ? detectedCountry : null;

  const chosenLocale = c.get(PREF_COOKIES.locale)?.value;
  const locale = isLocale(chosenLocale) ? chosenLocale : negotiateLocale(h.get("accept-language"));

  const chosenCurrency = c.get(PREF_COOKIES.currency)?.value?.toUpperCase();
  // Currency follows where the visitor actually is, even outside our markets.
  const currency = isCurrency(chosenCurrency) ? chosenCurrency : currencyForCountry(detectedCountry ?? country);

  return { country, detectedCountry, outsideMarkets, locale, dir: localeDir(locale), currency };
});
