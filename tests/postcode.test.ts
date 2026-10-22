import { afterEach, describe, expect, it, vi } from "vitest";
import { parsePostcode } from "@/lib/postcode";

vi.mock("@/lib/redis", () => ({ cached: (_k: string, _t: number, load: () => unknown) => load() }));
const { lookupPostcode } = await import("@/server/services/geo");

describe("parsePostcode", () => {
  it.each([
    ["sw1a1aa", "GB", "SW1A 1AA"],
    ["  m1  1ae ", "GB", "M1 1AE"],
    ["EC1A 1BB", "GB", "EC1A 1BB"],
    ["90210", "US", "90210"],
    ["90210-1234", "US", "90210"],
  ])("accepts %s", (raw, country, code) => expect(parsePostcode(raw)).toEqual({ country, code }));

  it.each(["SW1A", "1234", "902101", "ABC 123", "", "SW1A 1AA; DROP"])("rejects %s", (raw) => expect(parsePostcode(raw)).toBeNull());
});

describe("lookupPostcode", () => {
  afterEach(() => vi.unstubAllGlobals());
  const reply = (status: number, body?: unknown) =>
    vi.stubGlobal("fetch", vi.fn(async () => new Response(body ? JSON.stringify(body) : "", { status })));

  it("maps a UK postcode", async () => {
    reply(200, { result: { postcode: "SW1A 1AA", latitude: 51.501, longitude: -0.1416, admin_district: "Westminster", region: "London", country: "England" } });
    expect(await lookupPostcode("sw1a1aa")).toEqual({
      postcode: "SW1A 1AA", city: "Westminster", region: "London", country: "GB", latitude: 51.501, longitude: -0.1416,
    });
  });

  it("maps a US ZIP", async () => {
    reply(200, { "post code": "90210", places: [{ "place name": "Beverly Hills", "state abbreviation": "CA", latitude: "34.0901", longitude: "-118.4065" }] });
    expect(await lookupPostcode("90210")).toMatchObject({ city: "Beverly Hills", region: "CA", country: "US", latitude: 34.0901 });
  });

  it("returns null for a well-formed code that doesn't exist", async () => {
    reply(404);
    expect(await lookupPostcode("ZZ9 9ZZ")).toBeNull();
  });

  it("returns null for a postcode without coordinates", async () => {
    reply(200, { result: { postcode: "BX1 1LT", latitude: null, longitude: null, admin_district: null, region: null, country: "England" } });
    expect(await lookupPostcode("BX1 1LT")).toBeNull();
  });

  it("throws a 503 when the service is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fetch failed"); }));
    await expect(lookupPostcode("SW1A 1AA")).rejects.toMatchObject({ status: 503 });
  });

  it("never calls the network for malformed input", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    expect(await lookupPostcode("not a postcode")).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });
});
