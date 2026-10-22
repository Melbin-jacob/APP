import { cached } from "@/lib/redis";
import { parsePostcode } from "@/lib/postcode";
import { ApiError } from "../http";

// Postcode/ZIP → place. UK postcodes resolve via postcodes.io and US ZIPs via
// zippopotam.us (both free, no API key). Base URLs are overridable for tests
// and for swapping in a commercial geocoder.
const POSTCODES_IO = process.env.POSTCODES_IO_URL ?? "https://api.postcodes.io";
const ZIPPOPOTAM = process.env.ZIPPOPOTAM_URL ?? "https://api.zippopotam.us";

export type PostcodeLocation = {
  postcode: string; // normalised: "SW1A 1AA" / "90210"
  city: string; // district / town shown to the user and stored on the profile
  region: string | null; // "London", "CA"
  country: "GB" | "US";
  latitude: number;
  longitude: number;
};

async function getJson(url: string): Promise<unknown | null> {
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(5000), headers: { Accept: "application/json" } });
  } catch {
    throw new ApiError(503, "geo_unavailable", "We couldn't check your postcode right now. Please try again in a moment.");
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new ApiError(503, "geo_unavailable", "We couldn't check your postcode right now. Please try again in a moment.");
  return res.json();
}

type PostcodesIo = { result: { postcode: string; latitude: number | null; longitude: number | null; admin_district: string | null; region: string | null; country: string } };
type Zippopotam = { "post code": string; places: { "place name": string; "state abbreviation": string; latitude: string; longitude: string }[] };

async function fetchLocation(country: "GB" | "US", code: string): Promise<PostcodeLocation | null> {
  if (country === "GB") {
    const data = (await getJson(`${POSTCODES_IO}/postcodes/${encodeURIComponent(code)}`)) as PostcodesIo | null;
    const r = data?.result;
    // Some valid postcodes (e.g. PO boxes) have no coordinates; we can't place those on the map.
    if (!r || r.latitude == null || r.longitude == null) return null;
    return {
      postcode: r.postcode,
      city: r.admin_district ?? r.region ?? r.country,
      region: r.region,
      country: "GB",
      latitude: r.latitude,
      longitude: r.longitude,
    };
  }
  const data = (await getJson(`${ZIPPOPOTAM}/us/${encodeURIComponent(code)}`)) as Zippopotam | null;
  const place = data?.places?.[0];
  if (!place) return null;
  return {
    postcode: data["post code"],
    city: place["place name"],
    region: place["state abbreviation"],
    country: "US",
    latitude: Number(place.latitude),
    longitude: Number(place.longitude),
  };
}

/**
 * Resolve a full UK postcode or US ZIP to a place. Returns null when the
 * format is valid but the code doesn't exist; throws 503 when the lookup
 * service is unreachable. Results (including misses) are cached in Redis.
 */
export async function lookupPostcode(raw: string): Promise<PostcodeLocation | null> {
  const parsed = parsePostcode(raw);
  if (!parsed) return null;
  return cached(`geo:${parsed.country}:${parsed.code}`, 60 * 60 * 24 * 30, () => fetchLocation(parsed.country, parsed.code));
}
