// Postal-code rules per country, shared by the sign-up form and the server so
// both apply the same checks. To launch a new country: add it to COUNTRIES,
// add a lookup in src/server/services/geo.ts, and list it in
// NEXT_PUBLIC_SUPPORTED_COUNTRIES.

export type CountryCode = "US" | "CA" | "GB";

type CountryRule = {
  name: string;
  postalLabel: string; // what locals call it
  example: string;
  currency: string; // ISO 4217, used for the trader's rates
  /** Returns the normalised code, or null if the format is wrong. */
  normalize: (upper: string) => string | null;
  formatHint: string;
  areaExample: string; // for the "also cover these areas" field
};

export const COUNTRIES: Record<CountryCode, CountryRule> = {
  US: {
    name: "United States",
    postalLabel: "ZIP code",
    example: "10001",
    currency: "USD",
    // ZIP or ZIP+4; the 5-digit part identifies the area.
    normalize: (v) => v.match(/^(\d{5})(?:-?\d{4})?$/)?.[1] ?? null,
    formatHint: "Enter a 5-digit ZIP code, e.g. 10001.",
    areaExample: "10002, 10003",
  },
  CA: {
    name: "Canada",
    postalLabel: "Postal code",
    example: "M5V 3L9",
    currency: "CAD",
    // A1A 1A1. D, F, I, O, Q, U never appear; W and Z never lead.
    normalize: (v) => {
      const m = v.match(/^([ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z])\s?(\d[ABCEGHJ-NPRSTV-Z]\d)$/);
      return m ? `${m[1]} ${m[2]}` : null;
    },
    formatHint: "Enter a full postal code, e.g. M5V 3L9.",
    areaExample: "M5V, M5H",
  },
  GB: {
    name: "United Kingdom",
    postalLabel: "Postcode",
    example: "SW1A 1AA",
    currency: "GBP",
    normalize: (v) => {
      const m = v.match(/^([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})$/);
      return m ? `${m[1]} ${m[2]}` : null;
    },
    formatHint: "Enter a full postcode, e.g. SW1A 1AA.",
    areaExample: "SW1A, SW1B",
  },
};

const isCountry = (c: string): c is CountryCode => c in COUNTRIES;

/** Countries open for business, in display order. Defaults to the launch markets. */
export const SUPPORTED_COUNTRIES: CountryCode[] = (process.env.NEXT_PUBLIC_SUPPORTED_COUNTRIES ?? "CA,US")
  .split(",")
  .map((c) => c.trim().toUpperCase())
  .filter(isCountry);

export function isSupportedCountry(c: string): c is CountryCode {
  return (SUPPORTED_COUNTRIES as string[]).includes(c);
}

/** Format check + normalisation for one country. No network call. */
export function parsePostcode(country: CountryCode, raw: string): { country: CountryCode; code: string } | null {
  const code = COUNTRIES[country].normalize(raw.trim().toUpperCase().replace(/\s+/g, " "));
  return code ? { country, code } : null;
}

/** For free-text search: the first supported country whose format matches. */
export function detectPostcode(raw: string): { country: CountryCode; code: string } | null {
  for (const c of SUPPORTED_COUNTRIES) {
    const hit = parsePostcode(c, raw);
    if (hit) return hit;
  }
  return null;
}
