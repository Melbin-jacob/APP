"use client";

import { useMemo } from "react";
import { usePrefs } from "@/components/providers/PreferencesProvider";
import { birthYears } from "@/lib/age";

/**
 * Neutral age question: month and year of birth, nothing pre-selected and no
 * hint of the minimum age (FTC guidance for age screens). Field names
 * birthMonth / birthYear; the birth date is only checked, never stored.
 */
export function BirthDateFields({ error, value, onChange }: {
  error?: string;
  value?: { month: string; year: string };
  onChange?: (v: { month: string; year: string }) => void;
}) {
  const { t, locale } = usePrefs();
  const months = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" });
    return Array.from({ length: 12 }, (_, i) => fmt.format(new Date(Date.UTC(2000, i, 1))));
  }, [locale]);
  const controlled = value && onChange;

  return (
    <fieldset aria-describedby="birth-hint">
      <legend className="label">{t("age.label")}</legend>
      <div className="grid grid-cols-2 gap-3">
        <select name="birthMonth" required aria-label={t("age.month")} className="input" aria-invalid={!!error}
          {...(controlled ? { value: value.month, onChange: (e) => onChange({ ...value, month: e.target.value }) } : { defaultValue: "" })}>
          <option value="" disabled>{t("age.month")}</option>
          {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select name="birthYear" required aria-label={t("age.year")} className="input" aria-invalid={!!error}
          {...(controlled ? { value: value.year, onChange: (e) => onChange({ ...value, year: e.target.value }) } : { defaultValue: "" })}>
          <option value="" disabled>{t("age.year")}</option>
          {birthYears().map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <p id="birth-hint" className={`mt-1 text-xs ${error ? "text-rose-600" : "text-ink-500"}`}>{error || t("age.hint")}</p>
    </fieldset>
  );
}
