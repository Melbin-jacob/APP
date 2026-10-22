// Display currencies. All are published daily by the European Central Bank,
// which is where exchange rates come from (see src/server/services/fx.ts).
export const CURRENCIES = [
  "USD", "CAD", "EUR", "GBP", "MXN", "AUD", "NZD", "JPY", "CNY", "HKD", "SGD", "INR",
  "KRW", "BRL", "CHF", "SEK", "NOK", "DKK", "PLN", "TRY", "ZAR", "ILS", "PHP", "THB",
] as const;

export type Currency = (typeof CURRENCIES)[number];
export const isCurrency = (v: unknown): v is Currency => (CURRENCIES as readonly unknown[]).includes(v);

const EURO = ["AT", "BE", "CY", "DE", "EE", "ES", "FI", "FR", "GR", "HR", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PT", "SI", "SK"];

const BY_COUNTRY: Record<string, Currency> = {
  US: "USD", CA: "CAD", MX: "MXN", GB: "GBP", AU: "AUD", NZ: "NZD", JP: "JPY", CN: "CNY", HK: "HKD", SG: "SGD",
  IN: "INR", KR: "KRW", BR: "BRL", CH: "CHF", LI: "CHF", SE: "SEK", NO: "NOK", DK: "DKK", PL: "PLN", TR: "TRY",
  ZA: "ZAR", IL: "ILS", PH: "PHP", TH: "THB",
  ...Object.fromEntries(EURO.map((c) => [c, "EUR" as const])),
};

/** The local currency for a visitor's country; USD where we don't list theirs. */
export const currencyForCountry = (country: string | null | undefined): Currency =>
  (country && BY_COUNTRY[country.toUpperCase()]) || "USD";

/** Exchange rates as units of each currency per 1 USD. */
export type Rates = Partial<Record<Currency, number>> & { USD: number };

/**
 * Formats a price stored in minor units (cents) of `from`, shown in `to`.
 * Converted amounts are marked "≈" because rates move daily and the
 * professional charges in their own currency.
 */
export function formatPrice(
  minor: number | null | undefined,
  from: string,
  opts: { to: Currency; rates: Rates; locale: string },
): { text: string; converted: boolean; original: string } | null {
  if (minor == null) return null;
  const fmt = (amount: number, currency: string) =>
    new Intl.NumberFormat(opts.locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  const original = fmt(minor / 100, from);
  const fromRate = opts.rates[from as Currency];
  const toRate = opts.rates[opts.to];
  if (from === opts.to || !fromRate || !toRate) return { text: original, converted: false, original };
  return { text: `≈ ${fmt((minor / 100) * (toRate / fromRate), opts.to)}`, converted: true, original };
}
