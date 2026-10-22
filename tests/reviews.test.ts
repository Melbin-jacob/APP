import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/redis", () => ({ redis: {}, cached: vi.fn(), invalidate: vi.fn() }));

const { looksSpammy, reviewSubmitInput } = await import("@/server/services/reviews");

describe("spam heuristics", () => {
  it("flags links, char floods and shouting", () => {
    expect(looksSpammy("great, visit www.cheap-pills.biz")).toBe(true);
    expect(looksSpammy("amazinggggggggggg")).toBe(true);
    expect(looksSpammy("THIS IS THE WORST SERVICE EVER DO NOT USE")).toBe(true);
  });
  it("passes ordinary reviews", () => {
    expect(looksSpammy("Arrived on time and fixed the leak quickly. Would hire again.")).toBe(false);
  });
});

describe("review submission schema", () => {
  const base = { token: "a".repeat(43), rating: 5, authorName: "Jo" };
  it("accepts a valid payload", () => expect(reviewSubmitInput.safeParse(base).success).toBe(true));
  it("rejects out-of-range ratings", () => {
    expect(reviewSubmitInput.safeParse({ ...base, rating: 0 }).success).toBe(false);
    expect(reviewSubmitInput.safeParse({ ...base, rating: 6 }).success).toBe(false);
    expect(reviewSubmitInput.safeParse({ ...base, rating: 4.5 }).success).toBe(false);
  });
  it("rejects malformed tokens", () => expect(reviewSubmitInput.safeParse({ ...base, token: "../../etc" }).success).toBe(false));
});
