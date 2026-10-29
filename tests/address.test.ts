import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/redis", () => ({ cached: (_k: string, _t: number, load: () => Promise<unknown>) => load() }));
const { suggestAddresses } = await import("@/server/services/address");

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
    expect(out).toEqual([
      { addressLine: "222 Bridge Avenue", city: "Windsor", postcode: "N9B 2M2", region: "Ontario", label: "222 Bridge Avenue, Windsor, Ontario N9B 2M2" },
      { addressLine: "Bridge Avenue", city: "Windsor", postcode: "", region: "Ontario", label: "Bridge Avenue, Windsor, Ontario N9B" },
    ]);
    const url = new URL(String(fetch.mock.calls[0]![0]));
    expect(url.searchParams.get("q")).toBe("222 bridge");
    expect(url.searchParams.get("lat")).toBe("42.3");
  });

  it("asks for nothing under 3 characters and never throws when the provider fails", async () => {
    const fetch = vi.fn(async (_url: string) => new Response("down", { status: 503 }));
    vi.stubGlobal("fetch", fetch);
    expect(await suggestAddresses("22", "CA", null)).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
    expect(await suggestAddresses("222 bridge", "CA", null)).toEqual([]);
  });
});
