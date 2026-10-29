import { createHash } from "node:crypto";
import { type CountryCode, parsePostcode } from "@/lib/postcode";
import { cached } from "@/lib/redis";

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

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(4000), headers: { Accept: "application/json", "User-Agent": "GetTradePros address lookup" } });
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

async function photon(q: string, country: string, near: Near): Promise<AddressSuggestion[]> {
  const params = new URLSearchParams({ q, limit: "10", lang: "en" });
  params.append("layer", "house");
  params.append("layer", "street");
  if (near) { params.set("lat", String(near.latitude)); params.set("lon", String(near.longitude)); }
  const data = (await getJson(`${PHOTON}/api/?${params}`)) as { features?: PhotonFeature[] };
  return (data.features ?? [])
    .map((f) => f.properties)
    .filter((p) => p.countrycode?.toUpperCase() === country)
    .map((p) => {
      const s = {
        addressLine: line(p.housenumber, p.street ?? (p.type === "street" ? p.name : undefined)),
        city: p.city ?? p.town ?? p.village ?? p.district ?? "",
        postcode: p.postcode ?? "",
        region: p.state ?? null,
      };
      return { ...s, label: label(s) };
    });
}

type GeoapifyResult = { housenumber?: string; street?: string; city?: string; postcode?: string; state_code?: string; state?: string };

async function geoapify(q: string, country: string, near: Near, key: string): Promise<AddressSuggestion[]> {
  const params = new URLSearchParams({ text: q, limit: "8", format: "json", lang: "en", filter: `countrycode:${country.toLowerCase()}`, apiKey: key });
  if (near) params.set("bias", `proximity:${near.longitude},${near.latitude}`);
  const data = (await getJson(`${GEOAPIFY}/v1/geocode/autocomplete?${params}`)) as { results?: GeoapifyResult[] };
  return (data.results ?? []).map((r) => {
    const s = { addressLine: line(r.housenumber, r.street), city: r.city ?? "", postcode: r.postcode ?? "", region: r.state_code ?? r.state ?? null };
    return { ...s, label: label(s) };
  });
}

/** Up to 6 distinct street addresses matching what the visitor typed, nearest first when `near` is given. */
export async function suggestAddresses(rawQuery: string, country: string, near: Near): Promise<AddressSuggestion[]> {
  const q = rawQuery.trim().replace(/\s+/g, " ").slice(0, 120);
  if (q.length < 3) return [];
  const key = process.env.GEOAPIFY_API_KEY;
  // Round the bias point so nearby visitors share cache entries; hash the
  // query so typed addresses don't sit in Redis key names.
  const where = near ? `${near.latitude.toFixed(1)},${near.longitude.toFixed(1)}` : "-";
  const cacheKey = `addr:${key ? "g" : "p"}:${country}:${where}:${createHash("sha256").update(q.toLowerCase()).digest("base64url")}`;
  try {
    const found = await cached(cacheKey, 60 * 60 * 24, () => (key ? geoapify(q, country, near, key) : photon(q, country, near)));
    const seen = new Set<string>();
    return found
      // Street-level results often carry only part of a postcode ("N9B"); fill only complete ones.
      .map((s) => ({ ...s, postcode: parsePostcode(country as CountryCode, s.postcode)?.code ?? "" }))
      .filter((s) => s.addressLine && !seen.has(s.label) && seen.add(s.label))
      .slice(0, 6);
  } catch (err) {
    console.warn("[address] lookup failed", err instanceof Error ? err.message : err);
    return [];
  }
}
