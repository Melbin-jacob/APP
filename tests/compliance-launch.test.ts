import { describe, expect, it } from "vitest";
import { ageFrom, MIN_ACCOUNT_AGE } from "@/lib/age";
import { sendEmail } from "@/server/email/transport";

describe("age gate", () => {
  const now = new Date(Date.UTC(2026, 9, 29)); // 29 Oct 2026

  it("counts whole years, treating a birthday in the current month as not yet reached", () => {
    expect(ageFrom(9, 2008, now)).toBe(18); // Sept 2008: turned 18 last month
    expect(ageFrom(10, 2008, now)).toBe(17); // Oct 2008: may not be 18 yet, so not yet
    expect(ageFrom(11, 2008, now)).toBe(17);
    expect(ageFrom(1, 2014, now)).toBe(12); // under 13: COPPA territory
  });

  it("requires adults", () => expect(MIN_ACCOUNT_AGE).toBe(18));
});

describe("commercial email", () => {
  it("refuses to send marketing email without an unsubscribe link", async () => {
    await expect(sendEmail({ to: "a@example.com", subject: "We're live!", html: "<p>hi</p>", text: "hi", commercial: true }))
      .rejects.toThrow(/unsubscribe/);
  });
});

