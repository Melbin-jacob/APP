import { CURRENCIES, type Rates } from "@/lib/currency";
import { cached, redis } from "@/lib/redis";

// Daily reference rates from the European Central Bank via Frankfurter
// (free, no key). Override FX_RATES_URL to use another provider with the
// same response shape: { rates: { EUR: 0.92, ... } } relative to USD.
const URL_ = process.env.FX_RATES_URL ?? "https://api.frankfurter.app/latest?from=USD";

// Used only when the rates service can't be reached, so prices still show.
// Approximate; refreshed whenever the live source is back.
const FALLBACK: Rates = {
  USD: 1, CAD: 1.37, EUR: 0.92, GBP: 0.79, MXN: 18.5, AUD: 1.52, NZD: 1.66, JPY: 150, CNY: 7.2, HKD: 7.8,
  SGD: 1.34, INR: 84, KRW: 1380, BRL: 5.5, CHF: 0.88, SEK: 10.6, NOK: 10.8, DKK: 6.9, PLN: 4.0, TRY: 34,
  ZAR: 18.2, ILS: 3.7, PHP: 57, THB: 35,
};

async function fetchRates(): Promise<Rates> {
  const res = await fetch(URL_, { signal: AbortSignal.timeout(5000), headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`FX ${res.status}`);
  const body = (await res.json()) as { rates?: Record<string, number> };
  const rates: Rates = { USD: 1 };
  for (const c of CURRENCIES) {
    const r = body.rates?.[c];
    if (typeof r === "number" && r > 0) rates[c] = r;
  }
  if (Object.keys(rates).length < 5) throw new Error("FX response missing rates");
  return rates;
}

/** Current rates (cached 6 hours); falls back to approximate built-in rates. */
export async function getRates(): Promise<Rates> {
  try {
    return await cached("fx:usd", 60 * 60 * 6, fetchRates);
  } catch (err) {
    console.warn("[fx] using fallback rates:", (err as Error).message);
    // Remember the miss briefly so pages don't each wait on a dead service.
    redis.set("fx:usd", JSON.stringify(FALLBACK), "EX", 600).catch(() => {});
    return FALLBACK;
  }
}
