"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { usePrefs } from "@/components/providers/PreferencesProvider";
import { api } from "@/lib/api-client";
import { CURRENCIES } from "@/lib/currency";
import { countryName, currencyName, flag } from "@/lib/format";
import { type CountryCode, SUPPORTED_COUNTRIES } from "@/lib/postcode";
import { LOCALES } from "@/i18n/locales";

type Pref = "country" | "locale" | "currency";

/**
 * Thin bar above the header: market, language and currency. Defaults come
 * from the visitor's location and browser; any change is remembered for a year.
 * Country and currency names come from the runtime's locale data, which can
 * differ slightly between server and browser: suppressHydrationWarning.
 */
export function PreferencesBar({ outsideMarkets, marketCounts }: { outsideMarkets: string | null; marketCounts?: Record<CountryCode, number> }) {
  const { t, locale, currency, country } = usePrefs();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  const change = async (key: Pref, value: string) => {
    setError(false);
    try {
      await api("/api/preferences", { method: "POST", json: { [key]: value } });
      // Re-render server components with the new cookies, keeping the current page.
      startTransition(() => router.refresh());
    } catch {
      setError(true);
    }
  };

  // A market we've opened but nobody has listed in yet: point to one that has listings.
  const otherMarkets = marketCounts && marketCounts[country] === 0 ? SUPPORTED_COUNTRIES.filter((c) => marketCounts[c] > 0) : [];

  const select = "cursor-pointer rounded border border-white/20 bg-ink-900 px-2 py-1 text-xs text-white hover:border-white/50 disabled:opacity-60";

  return (
    <div className="bg-ink-900 text-white" aria-busy={pending}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-1.5 text-xs">
        <label className="flex items-center gap-2">
          <span className="text-white/70">{t("prefs.showingIn")}</span>
          <select aria-label={t("prefs.region")} value={country} disabled={pending} onChange={(e) => change("country", e.target.value)} className={select}>
            {SUPPORTED_COUNTRIES.map((c) => (
              <option key={c} value={c} suppressHydrationWarning>{flag(c)} {countryName(c, locale)}</option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-white/70" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm-10 10h20M12 2c2.8 3 4 6.4 4 10s-1.2 7-4 10c-2.8-3-4-6.4-4-10s1.2-7 4-10Z" />
            </svg>
            <span className="sr-only">{t("prefs.language")}</span>
            <select aria-label={t("prefs.language")} value={locale} disabled={pending} onChange={(e) => change("locale", e.target.value)} className={select}>
              {LOCALES.map((l) => <option key={l.code} value={l.code} lang={l.code}>{l.name}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-white/70">{t("prefs.currency")}</span>
            <select aria-label={t("prefs.currency")} value={currency} disabled={pending} onChange={(e) => change("currency", e.target.value)} className={select}>
              {CURRENCIES.map((c) => <option key={c} value={c} suppressHydrationWarning>{c} · {currencyName(c, locale)}</option>)}
            </select>
          </label>
        </div>
      </div>
      {outsideMarkets && (
        <p className="bg-accent-500 px-4 py-1.5 text-center text-xs font-medium text-white" role="status" suppressHydrationWarning>
          {t("prefs.outsideMarkets", { country: countryName(outsideMarkets, locale), market: countryName(country, locale) })}
        </p>
      )}
      {otherMarkets.length > 0 && (
        <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-accent-500 px-4 py-1.5 text-center text-xs font-medium text-white" role="status" suppressHydrationWarning>
          {t("prefs.emptyMarket", { country: countryName(country, locale) })}
          {otherMarkets.map((c) => (
            <button key={c} type="button" disabled={pending} onClick={() => change("country", c)} className="rounded bg-white px-2 py-0.5 font-semibold text-ink-900 hover:bg-white/90" suppressHydrationWarning>
              {flag(c)} {t("prefs.browseMarket", { market: countryName(c, locale) })}
            </button>
          ))}
        </p>
      )}
      {error && <p className="bg-rose-600 px-4 py-1 text-center text-xs" role="alert">{t("common.somethingWrong")}</p>}
    </div>
  );
}
