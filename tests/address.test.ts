import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/redis", () => ({ cached: (_k: string, _t: number, load: () => Promise<unknown>) => load() }));
const { refineSuggestions, suggestAddresses } = await import("@/server/services/address");

const feature = (p: Record<string, string>) => ({ properties: { countrycode: "CA", state: "Ontario", ...p } });
const photonReply = (features: unknown[]) => vi.fn(async (_url: string) => new Response(JSON.stringify({ features }), { status: 200 }));

afterEach(() => { vi.unstubAllGlobals(); });

describe("address suggestions", () => {
  it("maps results, keeps the visitor's country, and drops partial postcodes", async () => {
    const fetch = photonReply([
      feature({ type: "house", housenumber: "222", street: "Bridge Avenue", city: "Windsor", postcode: "N9B 2M2" }),
      feature({ type: "street", name: "Bridge Avenue", city: "Windsor", postcode: "N9B" }),
      { properties: { countrycode: "US", type: "house", housenumber: "222", street: "Bridge Ave", city: "Detroit", postcode: "48209" } },
    ]);
    vi.stubGlobal("fetch", fetch);
    const out = await suggestAddresses("222 bridge", "CA", { latitude: 42.3, longitude: -83 });
    // The street-only result becomes "222 Bridge Avenue" too, and is merged into the exact one.
    expect(out).toEqual([
      { addressLine: "222 Bridge Avenue", city: "Windsor", postcode: "N9B 2M2", region: "Ontario", label: "222 Bridge Avenue, Windsor, Ontario N9B 2M2" },
    ]);
    const url = new URL(String(fetch.mock.calls[0]![0]));
    expect(url.searchParams.get("q")).toBe("222 bridge");
    expect(url.searchParams.get("lat")).toBe("42.3");
    expect(url.searchParams.get("bbox")).toBe("-84.30,41.40,-81.70,43.20"); // ~100 km around the business
  });

  it("falls back to a country-wide search when nearby results are all in another country", async () => {
    const us = { properties: { countrycode: "US", type: "house", housenumber: "222", street: "Bridge Ave", city: "Detroit", postcode: "48209" } };
    const fetch = vi.fn(async (url: string) => {
      const bbox = new URL(url).searchParams.get("bbox");
      const features = bbox === "-141.1,41.6,-52.6,83.2"
        ? [feature({ type: "house", housenumber: "222", street: "Bridge Avenue", city: "Windsor", postcode: "N9B 2M2" })]
        : [us];
      return new Response(JSON.stringify({ features }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetch);
    const out = await suggestAddresses("222 bridge ave", "CA", { latitude: 42.3, longitude: -83 });
    expect(out.map((s) => s.label)).toEqual(["222 Bridge Avenue, Windsor, Ontario N9B 2M2"]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("asks for nothing under 3 characters and never throws when the provider fails", async () => {
    const fetch = vi.fn(async (_url: string) => new Response("down", { status: 503 }));
    vi.stubGlobal("fetch", fetch);
    expect(await suggestAddresses("22", "CA", null)).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
    expect(await suggestAddresses("222 bridge", "CA", null)).toEqual([]);
  });
});

describe("refining suggestions", () => {
  const street = (addressLine: string, postcode: string, city = "Windsor") =>
    ({ addressLine, city, postcode, region: "Ontario", label: "", exact: false });

  it("keeps only the typed street, adds the typed house number, and lists each street once", () => {
    // What OpenStreetMap returned for "222 bridge ave" near Windsor.
    const out = refineSuggestions("222 bridge ave", "CA", [
      street("Prospect Avenue", "N9C 3G3"), street("Northway Avenue", "N9C 3Z3"), street("University Avenue West", "N9C 2J9"),
      street("Bridge Avenue", "N9B 1V7"), street("Bridge Avenue", "N9B 1M4"), street("Bridge Avenue", "N8X 4L1", "Tecumseh"),
    ]);
    expect(out).toEqual([
      // Postal codes change along a street, so the visitor types their own.
      { addressLine: "222 Bridge Avenue", city: "Windsor", postcode: "", region: "Ontario", label: "222 Bridge Avenue, Windsor, Ontario" },
      { addressLine: "222 Bridge Avenue", city: "Tecumseh", postcode: "", region: "Ontario", label: "222 Bridge Avenue, Tecumseh, Ontario" },
    ]);
  });

  it("matches partly typed street names and leaves results alone when no number was typed", () => {
    const out = refineSuggestions("bridg", "CA", [street("Bridge Avenue", "N9B 1V7"), street("Prospect Avenue", "N9C 3G3")]);
    expect(out.map((s) => [s.addressLine, s.postcode])).toEqual([["Bridge Avenue", "N9B 1V7"]]);
  });
});
