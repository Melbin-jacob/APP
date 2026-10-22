"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { type Currency, formatPrice, type Rates } from "@/lib/currency";
import type { CountryCode } from "@/lib/postcode";
import { createT, type Messages, type T } from "@/i18n";
import type { Locale } from "@/i18n/locales";

type Prefs = { locale: Locale; currency: Currency; country: CountryCode; rates: Rates; messages: Messages };
type Ctx = Prefs & { t: T };

const PrefsContext = createContext<Ctx | null>(null);

export function PreferencesProvider({ children, locale, currency, country, rates, messages }: Prefs & { children: ReactNode }) {
  const value = useMemo(
    () => ({ locale, currency, country, rates, messages, t: createT(messages) }),
    [locale, currency, country, rates, messages],
  );
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): Ctx {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs must be used inside <PreferencesProvider>");
  return ctx;
}

export const useT = () => usePrefs().t;

/** Price in the visitor's currency, from minor units of the professional's own currency. */
export function usePrice() {
  const { currency, rates, locale } = usePrefs();
  return (minor: number | null | undefined, from: string) => formatPrice(minor, from, { to: currency, rates, locale });
}
