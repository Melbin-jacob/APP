import { type CountryCode, parsePostcode } from "@/lib/postcode";
import { cached } from "@/lib/redis";
import { ApiError } from "../http";

// Postal code → place, one lookup per country. Both services are free and
// need no API key; base URLs are overridable for tests and for swapping in a
// commercial geocoder.
//   US, CA → zippopotam.us (covers ~60 countries, so most new markets only
//            need an entry in LOOKUPS)
//   GB     → postcodes.io
const ZIPPOPOTAM = process.env.ZIPPOPOTAM_URL ?? "https://api.zippopotam.us";
const POSTCODES_IO = process.env.POSTCODES_IO_URL ?? "https://api.postcodes.io";

export type PostcodeLocation = {
  postcode: string; // normalised: "10001" / "M5V 3L9"
  city: string; // town shown to the user and stored on the profile
  region: string | null; // state / province: "NY", "ON"
  country: CountryCode;
  latitude: number;
  longitude: number;
};

const UNAVAILABLE = "We couldn't check your postal code right now. Please try again in a moment.";

async function getJson(url: string): Promise<unknown | null> {
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(5000), headers: { Accept: "application/json" } });
  } catch {
    throw new ApiError(503, "geo_unavailable", UNAVAILABLE);
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new ApiError(503, "geo_unavailable", UNAVAILABLE);
  return res.json();
}

type Zippopotam = { places?: { "place name": string; "state abbreviation": string; latitude: string; longitude: string }[] };
type PostcodesIo = { result: { postcode: string; latitude: number | null; longitude: number | null; admin_district: string | null; region: string | null; country: string } };

type Place = Omit<PostcodeLocation, "postcode" | "country">;

async function zippopotam(country: string, key: string): Promise<Place | null> {
  const data = (await getJson(`${ZIPPOPOTAM}/${country}/${encodeURIComponent(key)}`)) as Zippopotam | null;
  const place = data?.places?.[0];
  if (!place) return null;
  return {
    // Canadian entries read like "Downtown Toronto (Harbourfront / CN Tower)"; keep the town part.
    city: place["place name"].replace(/\s*\(.*\)\s*$/, "").trim(),
    region: place["state abbreviation"] || null,
    latitude: Number(place.latitude),
    longitude: Number(place.longitude),
  };
}

const LOOKUPS: Record<CountryCode, (code: string) => Promise<Place | null>> = {
  US: (zip) => zippopotam("us", zip),
  // Free Canadian data is published per forward sortation area (the first
  // three characters, e.g. M5V), which places a business to within its
  // neighbourhood. The full postal code is still validated and stored.
  CA: (code) => zippopotam("ca", code.slice(0, 3)),
  GB: async (code) => {
    const r = ((await getJson(`${POSTCODES_IO}/postcodes/${encodeURIComponent(code)}`)) as PostcodesIo | null)?.result;
    // Some valid postcodes (e.g. PO boxes) have no coordinates; those can't go on the map.
    if (!r || r.latitude == null || r.longitude == null) return null;
    return { city: r.admin_district ?? r.region ?? r.country, region: r.region, latitude: r.latitude, longitude: r.longitude };
  },
};

/**
 * Resolve a postal code in a given country to a place. Returns null when the
 * format is wrong or the code doesn't exist; throws 503 when the lookup
 * service is unreachable. Results (including misses) are cached in Redis.
 */
export async function lookupPostcode(country: CountryCode, raw: string): Promise<PostcodeLocation | null> {
  const parsed = parsePostcode(country, raw);
  if (!parsed) return null;
  const place = await cached(`geo:${country}:${parsed.code}`, 60 * 60 * 24 * 30, () => LOOKUPS[country](parsed.code));
  return place && { ...place, postcode: parsed.code, country };
}
