/**
 * Amounts are stored in minor units (cents). Visitor-facing prices go through
 * formatPrice() in lib/currency so they show in the visitor's currency; this
 * is for places that should show the professional's own currency.
 */
export function formatMoney(minor: number | null | undefined, currency = "USD", locale = "en") {
  if (minor == null) return null;
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(minor / 100);
}

export function formatDate(d: Date | string, locale = "en-GB") {
  return new Date(d).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
}

/** Localised country name ("CA" → "Canada" / "Kanada" / "加拿大"). */
export function countryName(code: string, locale: string) {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Localised currency name ("EUR" → "Euro" / "euro" / "欧元"). */
export function currencyName(code: string, locale: string) {
  try {
    return new Intl.DisplayNames([locale], { type: "currency" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Flag emoji from an ISO country code (regional indicator symbols). */
export const flag = (code: string) =>
  String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
