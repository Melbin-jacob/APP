import { afterEach, describe, expect, it, vi } from "vitest";
import { SUPPORTED_COUNTRIES, detectPostcode, parsePostcode } from "@/lib/postcode";

vi.mock("@/lib/redis", () => ({ cached: (_k: string, _t: number, load: () => unknown) => load() }));
const { lookupPostcode } = await import("@/server/services/geo");

describe("launch markets", () => {
  it("defaults to Canada, then the United States", () => expect(SUPPORTED_COUNTRIES).toEqual(["CA", "US"]));
});

describe("parsePostcode", () => {
  it.each([
    ["US", "10001", "10001"],
    ["US", "90210-1234", "90210"],
    ["US", " 02139 ", "02139"],
    ["CA", "m5v3l9", "M5V 3L9"],
    ["CA", "K1A 0B1", "K1A 0B1"],
    ["CA", "h2x  1y4", "H2X 1Y4"],
  ] as const)("%s accepts %s", (country, raw, code) => expect(parsePostcode(country, raw)).toEqual({ country, code }));

  it.each([
    ["US", "1234"],
    ["US", "100011"],
    ["US", "M5V 3L9"],
    ["CA", "10001"],
    ["CA", "M5V"],
    ["CA", "D1A 1A1"], // D never appears in Canadian postal codes
    ["CA", "W1A 1A1"], // W never leads
    ["CA", "M5V 3L9; DROP"],
  ] as const)("%s rejects %s", (country, raw) => expect(parsePostcode(country, raw)).toBeNull());

  it("detects the market from free text", () => {
    expect(detectPostcode("10001")).toEqual({ country: "US", code: "10001" });
    expect(detectPostcode("m5v 3l9")).toEqual({ country: "CA", code: "M5V 3L9" });
    expect(detectPostcode("SW1A 1AA")).toBeNull(); // UK isn't a launch market
  });
});

describe("lookupPostcode", () => {
  afterEach(() => vi.unstubAllGlobals());
  const reply = (status: number, body?: unknown) => {
    const f = vi.fn(async (_url: string) => new Response(body ? JSON.stringify(body) : "", { status }));
    vi.stubGlobal("fetch", f);
    return f;
  };

  it("maps a US ZIP", async () => {
    const f = reply(200, { "post code": "10001", places: [{ "place name": "New York City", "state abbreviation": "NY", latitude: "40.7484", longitude: "-73.9967" }] });
    expect(await lookupPostcode("US", "10001")).toEqual({
      postcode: "10001", city: "New York City", region: "NY", country: "US", latitude: 40.7484, longitude: -73.9967,
    });
    expect(f.mock.calls[0][0]).toMatch(/\/us\/10001$/);
  });

  it("maps a Canadian postal code via its forward sortation area", async () => {
    const f = reply(200, { "post code": "M5V", places: [{ "place name": "Toronto (Harbourfront / CN Tower)", "state abbreviation": "ON", latitude: "43.6383", longitude: "-79.3957" }] });
    expect(await lookupPostcode("CA", "m5v3l9")).toEqual({
      postcode: "M5V 3L9", city: "Toronto", region: "ON", country: "CA", latitude: 43.6383, longitude: -79.3957,
    });
    expect(f.mock.calls[0][0]).toMatch(/\/ca\/M5V$/);
  });

  it("returns null for a well-formed code that doesn't exist", async () => {
    reply(404);
    expect(await lookupPostcode("US", "00000")).toBeNull();
  });

  it("throws a 503 when the service is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fetch failed"); }));
    await expect(lookupPostcode("US", "10001")).rejects.toMatchObject({ status: 503 });
  });

  it("never calls the network for malformed input", async () => {
    const f = reply(200, {});
    expect(await lookupPostcode("CA", "not a postcode")).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });
});
