"use client";

import { usePrefs } from "@/components/providers/PreferencesProvider";

/** Persistent disclaimer on every trader card (compact) and profile page (full). */
export function LegalDisclaimer({ variant = "full" }: { variant?: "full" | "compact" }) {
  const { t, locale } = usePrefs();
  if (variant === "compact") {
    return <p className="border-t border-ink-200 px-3 py-2 text-[10px] leading-snug text-ink-500">{t("legal.disclaimerShort")}</p>;
  }
  return (
    <aside role="note" aria-label={t("legal.important")} className="rounded-md border border-accent-400/40 bg-accent-400/10 p-4 text-xs leading-relaxed text-ink-700">
      <strong className="mb-1 block text-ink-900">{t("legal.important")}</strong>
      {t("legal.disclaimer")}
      {locale !== "en" && <span className="mt-2 block italic text-ink-500">{t("legal.translationNote")}</span>}
    </aside>
  );
}
