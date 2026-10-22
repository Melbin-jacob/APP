import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/redis", () => ({ redis: {}, cached: vi.fn(), invalidate: vi.fn() }));
vi.mock("@/lib/env", () => ({ env: () => ({ REVIEW_TOKEN_PEPPER: "p".repeat(40), APP_URL: "https://app.test" }) }));

const { clientIpFrom } = await import("@/server/http");
const { readUnsubscribeToken, unsubscribeLinks, unsubscribeToken } = await import("@/server/services/email-prefs");
const { RETENTION_DAYS } = await import("@/server/services/retention");

const headers = (h: Record<string, string>) => (n: string) => h[n] ?? null;

describe("clientIpFrom", () => {
  it("ignores a spoofed leftmost X-Forwarded-For entry", () => {
    expect(clientIpFrom(headers({ "x-forwarded-for": "6.6.6.6, 203.0.113.9" }))).toBe("203.0.113.9");
  });
  it("prefers platform-set headers", () => {
    expect(clientIpFrom(headers({ "x-vercel-forwarded-for": "198.51.100.4", "x-forwarded-for": "6.6.6.6" }))).toBe("198.51.100.4");
    expect(clientIpFrom(headers({ "cf-connecting-ip": "198.51.100.5" }))).toBe("198.51.100.5");
  });
  it("has a stable fallback", () => expect(clientIpFrom(headers({}))).toBe("0.0.0.0"));
});

describe("unsubscribe links", () => {
  it("round-trip and are case-insensitive on email", () => {
    expect(readUnsubscribeToken(unsubscribeToken("Jo@Example.com", "REVIEW_REQUESTS"))).toEqual({ email: "jo@example.com", scope: "REVIEW_REQUESTS" });
  });
  it("reject tampering", () => {
    const [payload, sig] = unsubscribeToken("jo@example.com", "NEWSLETTER").split(".");
    const forged = Buffer.from(JSON.stringify({ e: "victim@example.com", s: "NEWSLETTER" })).toString("base64url");
    expect(readUnsubscribeToken(`${forged}.${sig}`)).toBeNull();
    expect(readUnsubscribeToken(`${payload}.${"0".repeat(32)}`)).toBeNull();
    expect(readUnsubscribeToken("garbage")).toBeNull();
  });
  it("point at the page and the one-click endpoint", () => {
    const l = unsubscribeLinks("jo@example.com", "NEWSLETTER");
    expect(l.url).toMatch(/^https:\/\/app\.test\/unsubscribe\?t=/);
    expect(l.oneClickUrl).toMatch(/^https:\/\/app\.test\/api\/email\/unsubscribe\?t=/);
  });
});

describe("retention policy", () => {
  it("keeps every category for a bounded time", () => {
    for (const days of Object.values(RETENTION_DAYS)) expect(days).toBeGreaterThan(0);
    expect(RETENTION_DAYS.searchQueries).toBeLessThanOrEqual(400);
  });
});
