import { createHash } from "node:crypto";
import { type CountryCode, parsePostcode } from "@/lib/postcode";
import { cached } from "@/lib/redis";
import { logEvent } from "@/server/log";

// Street-address suggestions for address fields ("type a few letters, pick
// your address"). Looked up server-side so visitors' browsers never talk to a
// third party, and so the provider can be swapped without touching the UI.
//   default → Photon (OpenStreetMap data, free, no key; fair use only).
//             PHOTON_URL points it at a self-hosted or paid Photon instance.
//   GEOAPIFY_API_KEY set → Geoapify autocomplete (also OSM data; free tier
//             3,000 lookups a day, then paid), better for production traffic.
// Suggestions are a convenience: on any provider problem we return none and
// the visitor simply keeps typing.

const PHOTON = process.env.PHOTON_URL || "https://photon.komoot.io";
const GEOAPIFY = process.env.GEOAPIFY_URL || "https://api.geoapify.com";

export type AddressSuggestion = {
  label: string; // one line, shown in the list
  addressLine: string; // "222 Bridge Ave"
  city: string;
  postcode: string;
  region: string | null;
};

type Near = { latitude: number; longitude: number } | null;
/** A provider result; `exact` = it has a house number, not just a street. */
type Found = AddressSuggestion & { exact: boolean };

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(6000), headers: { Accept: "application/json", "User-Agent": "GetTradePros address lookup" } });
  if (!res.ok) throw new Error(`address provider ${res.status}`);
  return res.json();
}

const line = (houseNumber?: string, street?: string) => [houseNumber, street].filter(Boolean).join(" ");
const label = (s: Omit<AddressSuggestion, "label">) =>
  [s.addressLine, s.city, [s.region, s.postcode].filter(Boolean).join(" ")].filter(Boolean).join(", ");

type PhotonFeature = {
  properties: {
    housenumber?: string; street?: string; name?: string; city?: string; town?: string; village?: string; district?: string;
    postcode?: string; state?: string; countrycode?: string; type?: string;
  };
};

// Photon searches the whole world and location only nudges the ranking, so a
// common street name ("Bridge Ave") can fill the list with other countries'
// matches. Restrict each search to a box: around the business first (~100 km),
// then the whole country.
const COUNTRY_BOX: Record<string, string> = {
  CA: "-141.1,41.6,-52.6,83.2",
  US: "-179.2,18.9,-66.9,71.4",
  GB: "-8.7,49.8,1.8,60.9",
};
const boxAround = ({ latitude: lat, longitude: lon }: { latitude: number; longitude: number }) =>
  [lon - 1.3, lat - 0.9, lon + 1.3, lat + 0.9].map((n) => n.toFixed(2)).join(",");

async function photonSearch(q: string, country: string, near: Near, bbox: string | undefined): Promise<Found[]> {
  const params = new URLSearchParams({ q, limit: "15", lang: "en" });
  params.append("layer", "house");
  params.append("layer", "street");
  if (bbox) params.set("bbox", bbox);
  if (near) { params.set("lat", String(near.latitude)); params.set("lon", String(near.longitude)); }
  const data = (await getJson(`${PHOTON}/api/?${params}`)) as { features?: PhotonFeature[] };
  const all = (data.features ?? []).map((f) => f.properties);
  const kept = all
    .filter((p) => p.countrycode?.toUpperCase() === country)
    .map((p) => {
      const s = {
        addressLine: line(p.housenumber, p.street ?? (p.type === "street" ? p.name : undefined)),
        city: p.city ?? p.town ?? p.village ?? p.district ?? "",
        postcode: p.postcode ?? "",
        region: p.state ?? null,
      };
      return { ...s, label: label(s), exact: !!p.housenumber };
    });
  logEvent("address.lookup", { provider: "photon", scope: bbox === COUNTRY_BOX[country] ? "country" : bbox ? "near" : "world", found: all.length, kept: kept.length });
  return kept;
}

async function photon(q: string, country: string, near: Near): Promise<Found[]> {
  if (near) {
    const local = await photonSearch(q, country, near, boxAround(near));
    if (local.length > 0) return local;
  }
  return photonSearch(q, country, near, COUNTRY_BOX[country]);
}

type GeoapifyResult = { housenumber?: string; street?: string; city?: string; postcode?: string; state_code?: string; state?: string };

async function geoapify(q: string, country: string, near: Near, key: string): Promise<Found[]> {
  const params = new URLSearchParams({ text: q, limit: "8", format: "json", lang: "en", filter: `countrycode:${country.toLowerCase()}`, apiKey: key });
  if (near) params.set("bias", `proximity:${near.longitude},${near.latitude}`);
  const data = (await getJson(`${GEOAPIFY}/v1/geocode/autocomplete?${params}`)) as { results?: GeoapifyResult[] };
  return (data.results ?? []).map((r) => {
    const s = { addressLine: line(r.housenumber, r.street), city: r.city ?? "", postcode: r.postcode ?? "", region: r.state_code ?? r.state ?? null };
    return { ...s, label: label(s), exact: !!r.housenumber };
  });
}

// Words that say what kind of street it is, or which part; they match too
// many streets to be useful on their own ("ave" matched Prospect Avenue).
const STREET_WORDS = new Set([
  "ave", "av", "avenue", "st", "street", "rd", "road", "dr", "drive", "blvd", "boulevard", "cres", "crescent", "ct", "crt", "court",
  "pl", "place", "ln", "lane", "way", "hwy", "highway", "cir", "circle", "ter", "terrace", "pkwy", "parkway", "sq", "square",
  "n", "s", "e", "w", "north", "south", "east", "west", "unit", "apt", "suite",
]);

/**
 * Makes provider results fit what was typed:
 * - drops streets that don't contain the street name typed ("bridge");
 * - when the map only knows the street (many house numbers are missing in
 *   OpenStreetMap), keeps the house number the visitor typed, and leaves the
 *   postal code blank since it varies along a street;
 * - one entry per street and town, exact addresses first.
 */
export function refineSuggestions(q: string, country: string, found: Found[]): AddressSuggestion[] {
  const houseNumber = q.match(/^\s*(\d+[a-z]?)(?:\s|$)/i)?.[1];
  const words = q.toLowerCase().split(/[\s,]+/).filter((w) => w.length > 1 && !/^\d/.test(w) && !STREET_WORDS.has(w));
  const seen = new Set<string>();
  return found
    .filter((s) => {
      const have = s.addressLine.toLowerCase().split(/[\s-]+/);
      return words.every((w) => have.some((h) => h.startsWith(w)));
    })
    .map(({ exact, ...s }) => {
      const out = !exact && houseNumber && s.addressLine
        ? { ...s, addressLine: `${houseNumber} ${s.addressLine}`, postcode: "" }
        // Street-level results often carry only part of a postcode ("N9B"); fill only complete ones.
        : { ...s, postcode: parsePostcode(country as CountryCode, s.postcode)?.code ?? "" };
      return { ...out, label: label(out), exact };
    })
    .sort((a, b) => Number(b.exact) - Number(a.exact))
    .filter((s) => {
      const k = `${s.addressLine}|${s.city}`.toLowerCase();
      return s.addressLine !== "" && !seen.has(k) && !!seen.add(k);
    })
    .map(({ addressLine, city, postcode, region, label }) => ({ addressLine, city, postcode, region, label }))
    .slice(0, 6);
}

/** Up to 6 distinct street addresses matching what the visitor typed, nearest first when `near` is given. */
export async function suggestAddresses(rawQuery: string, country: string, near: Near): Promise<AddressSuggestion[]> {
  const q = rawQuery.trim().replace(/\s+/g, " ").slice(0, 120);
  if (q.length < 3) return [];
  const key = process.env.GEOAPIFY_API_KEY;
  // Round the bias point so nearby visitors share cache entries; hash the
  // query so typed addresses don't sit in Redis key names.
  const where = near ? `${near.latitude.toFixed(1)},${near.longitude.toFixed(1)}` : "-";
  const cacheKey = `addr3:${key ? "g" : "p"}:${country}:${where}:${createHash("sha256").update(q.toLowerCase()).digest("base64url")}`;
  try {
    const found = await cached(cacheKey, 60 * 60 * 24, () => (key ? geoapify(q, country, near, key) : photon(q, country, near)), (found) => found.length > 0);
    return refineSuggestions(q, country, found);
  } catch (err) {
    logEvent("address.lookup_failed", { error: err instanceof Error ? err.message : String(err) }, "warn");
    return [];
  }
}
