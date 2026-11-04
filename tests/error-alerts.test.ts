import { describe, expect, it } from "vitest";
import { fingerprint, pathOnly, scrub } from "@/server/error-alerts";

describe("error alerts", () => {
  it("masks personal-looking text in error messages", () => {
    expect(scrub('Unique constraint failed for "jane.doe@example.com"')).toBe('Unique constraint failed for "[email]"');
    expect(scrub("call +1 (519) 555-0142 back")).toBe("call [number] back");
    expect(scrub("token Zx3Cv5Bn7Mq9Wp1Ol2Ik4Uj6Yh8Tg0RfE expired")).toBe("token [token] expired");
    expect(scrub("word ".repeat(200)).length).toBe(500);
  });

  it("drops query strings, which can hold searches, postal codes or tokens", () => {
    expect(pathOnly("/review?token=abc&rating=5")).toBe("/review");
    expect(pathOnly("/search?q=plumber&location=N9A")).toBe("/search");
  });

  it("treats the same error with different numbers as one error", () => {
    const stack = "Error: x\n    at handler (/app/route.js:10:5)";
    expect(fingerprint("TypeError", "id 123 not found", stack)).toBe(fingerprint("TypeError", "id 456 not found", stack));
    expect(fingerprint("TypeError", "id 123 not found", stack)).not.toBe(fingerprint("RangeError", "id 123 not found", stack));
  });
});
