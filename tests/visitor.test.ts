import { beforeEach, describe, expect, it, vi } from "vitest";

let headerMap: Record<string, string> = {};
let cookieMap: Record<string, string> = {};
vi.mock("next/headers", () => ({
  headers: async () => new Headers(headerMap),
  cookies: async () => ({ get: (k: string) => (k in cookieMap ? { value: cookieMap[k] } : undefined) }),
}));
// React's cache() memoises per request; tests call it fresh each time.
vi.mock("react", async (orig) => ({ ...(await orig<typeof import("react")>()), cache: <T,>(fn: T) => fn }));

const { getVisitor } = await import("@/server/visitor");

beforeEach(() => {
  headerMap = {};
  cookieMap = {};
});

describe("getVisitor", () => {
  it("uses the edge geo header for market and currency", async () => {
    headerMap = { "x-vercel-ip-country": "CA", "accept-language": "fr-CA,fr;q=0.9" };
    expect(await getVisitor()).toMatchObject({ country: "CA", currency: "CAD", locale: "fr", dir: "ltr", outsideMarkets: null });
  });

  it("falls back to the browser language region without a geo header", async () => {
    headerMap = { "accept-language": "en-CA,en;q=0.9" };
    expect(await getVisitor()).toMatchObject({ country: "CA", currency: "CAD", locale: "en" });
  });

  it("shows the launch market to visitors elsewhere, with their own currency", async () => {
    headerMap = { "cf-ipcountry": "DE", "accept-language": "de-DE" };
    expect(await getVisitor()).toMatchObject({ country: "US", outsideMarkets: "DE", currency: "EUR", locale: "de" });
  });

  it("lets explicit choices win over location", async () => {
    headerMap = { "x-vercel-ip-country": "US", "accept-language": "en-US" };
    cookieMap = { hsd_country: "CA", hsd_locale: "ar", hsd_currency: "JPY" };
    expect(await getVisitor()).toMatchObject({ country: "CA", locale: "ar", dir: "rtl", currency: "JPY", outsideMarkets: null });
  });

  it("ignores tampered cookies", async () => {
    headerMap = { "x-vercel-ip-country": "US" };
    cookieMap = { hsd_country: "GB", hsd_locale: "xx", hsd_currency: "BTC" };
    expect(await getVisitor()).toMatchObject({ country: "US", locale: "en", currency: "USD" });
  });
});
