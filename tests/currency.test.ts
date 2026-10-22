import { describe, expect, it } from "vitest";
import { currencyForCountry, formatPrice, type Rates } from "@/lib/currency";

const rates: Rates = { USD: 1, CAD: 1.4, EUR: 0.9, JPY: 150 };

describe("currencyForCountry", () => {
  it.each([["US", "USD"], ["CA", "CAD"], ["FR", "EUR"], ["DE", "EUR"], ["JP", "JPY"], ["GB", "GBP"], ["NG", "USD"], [null, "USD"]])(
    "%s → %s", (country, currency) => expect(currencyForCountry(country)).toBe(currency),
  );
});

describe("formatPrice", () => {
  it("shows the original when currencies match", () => {
    expect(formatPrice(6500, "USD", { to: "USD", rates, locale: "en-US" })).toEqual({ text: "$65", converted: false, original: "$65" });
  });
  it("converts via USD and marks the result approximate", () => {
    // 65 CAD → 65 / 1.4 USD → × 0.9 EUR ≈ 41.79 → "€42"
    const p = formatPrice(6500, "CAD", { to: "EUR", rates, locale: "en-US" })!;
    expect(p.converted).toBe(true);
    expect(p.text).toBe("≈ €42");
    expect(p.original).toBe("CA$65");
  });
  it("uses the visitor's locale for formatting", () => {
    expect(formatPrice(6500, "USD", { to: "EUR", rates, locale: "de-DE" })!.text).toMatch(/^≈ 59\s?€$/);
    expect(formatPrice(6500, "USD", { to: "JPY", rates, locale: "ja-JP" })!.text).toMatch(/9,750/);
  });
  it("falls back to the original when a rate is missing", () => {
    expect(formatPrice(6500, "USD", { to: "INR", rates, locale: "en" })!.converted).toBe(false);
  });
  it("returns null without a price", () => expect(formatPrice(null, "USD", { to: "USD", rates, locale: "en" })).toBeNull());
});
