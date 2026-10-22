"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefs } from "@/components/providers/PreferencesProvider";
import { api, ClientApiError } from "@/lib/api-client";
import { countryName } from "@/lib/format";
import { COUNTRIES, type CountryCode, SUPPORTED_COUNTRIES, parsePostcode } from "@/lib/postcode";

export type VerifiedLocation = {
  postcode: string;
  city: string;
  region: string | null;
  country: CountryCode;
  latitude: number;
  longitude: number;
};

type State =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "ok"; location: VerifiedLocation }
  | { kind: "error"; message: string };

/**
 * Country + postal code fields. The code is looked up as soon as it's
 * complete and the matched place is shown. The parent owns the selected
 * country and unlocks the rest of the form only once `onChange` receives a
 * location.
 */
export function PostcodeLookup({
  country,
  onCountryChange,
  onChange,
  serverError,
}: {
  country: CountryCode;
  onCountryChange: (c: CountryCode) => void;
  onChange: (loc: VerifiedLocation | null) => void;
  serverError?: string;
}) {
  const { t, locale } = usePrefs();
  const [value, setValue] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const latest = useRef(0);
  const verified = useRef<string | null>(null); // "CA:M5V 3L9" of the current match
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const label = t(`register.postalLabels.${country}`);
  const hint = t(`register.postalHints.${country}`);

  const errorMessage = (err: unknown) => {
    if (!(err instanceof ClientApiError)) return t("common.somethingWrong");
    switch (err.code) {
      case "invalid_postcode": return hint;
      case "postcode_not_found": return t("register.notFound", { label });
      case "geo_unavailable": return t("register.lookupDown", { label });
      case "unsupported_country": return t("register.unsupported");
      case "rate_limited": return err.message;
      default: return t("common.somethingWrong");
    }
  };

  const check = async (raw: string) => {
    const parsed = parsePostcode(country, raw);
    if (!parsed) {
      setState({ kind: "error", message: hint });
      return;
    }
    const id = ++latest.current;
    setState({ kind: "checking" });
    try {
      const { location } = await api<{ location: VerifiedLocation }>(
        `/api/geo/postcode?country=${country}&code=${encodeURIComponent(parsed.code)}`,
      );
      if (id !== latest.current) return; // a newer lookup superseded this one
      verified.current = `${country}:${location.postcode}`;
      setValue(location.postcode);
      setState({ kind: "ok", location });
      onChangeRef.current(location);
    } catch (err) {
      if (id !== latest.current) return;
      setState({ kind: "error", message: errorMessage(err) });
    }
  };

  // Look up automatically once the code is complete; any edit (or a country
  // change) re-locks the form.
  useEffect(() => {
    const parsed = parsePostcode(country, value);
    // Reformatting the field to the matched code isn't a new edit.
    if (verified.current && parsed && `${country}:${parsed.code}` === verified.current) return;
    verified.current = null;
    onChangeRef.current(null);
    if (!parsed) {
      latest.current++;
      setState({ kind: "idle" });
      return;
    }
    const timer = setTimeout(() => check(value), 400);
    return () => clearTimeout(timer);
    // check() reads the current country/value; it doesn't need to be a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, country]);

  const message = state.kind === "error" ? state.message : serverError;
  const place = (loc: VerifiedLocation) =>
    [loc.city, loc.region, countryName(loc.country, locale)].filter((v, i, a) => v && a.indexOf(v) === i).join(", ");

  return (
    <>
      <div>
        <label htmlFor="country" className="label">{t("register.country")}</label>
        <select id="country" name="country" value={country} onChange={(e) => onCountryChange(e.target.value as CountryCode)} className="input" autoComplete="country">
          {SUPPORTED_COUNTRIES.map((c) => <option key={c} value={c} suppressHydrationWarning>{countryName(c, locale)}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="postcode" className="label first-letter:uppercase">{t("register.postal", { label })}</label>
        <div className="flex gap-2">
          <input
            id="postcode"
            name="postcode"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => value.trim() && state.kind !== "ok" && state.kind !== "checking" && check(value)}
            required
            maxLength={10}
            autoComplete="postal-code"
            inputMode={country === "US" ? "numeric" : "text"}
            placeholder={COUNTRIES[country].example}
            aria-invalid={state.kind === "error"}
            aria-describedby="postcode-status"
            dir="ltr"
            className="input uppercase"
          />
          <button type="button" onClick={() => check(value)} disabled={state.kind === "checking" || !value.trim()} className="btn-ghost shrink-0 px-4">
            {state.kind === "checking" ? t("register.checking") : t("register.find")}
          </button>
        </div>
      </div>
      <div id="postcode-status" aria-live="polite" className="min-h-5 text-sm sm:col-span-2">
        {state.kind === "ok" && (
          <p className="flex items-center gap-2 rounded-md bg-brand-50 px-3 py-2 text-brand-700">
            <span aria-hidden="true">✓</span>
            <span>{t("register.matched", { code: state.location.postcode, place: place(state.location) })}</span>
          </p>
        )}
        {state.kind === "checking" && <p className="text-ink-500">{t("register.lookingUp", { label })}</p>}
        {message && state.kind !== "ok" && state.kind !== "checking" && <p className="text-rose-600">{message}</p>}
        {state.kind === "idle" && !message && <p className="text-ink-500">{t("register.startHere", { label })}</p>}
      </div>
    </>
  );
}
