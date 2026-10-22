"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { usePrefs } from "@/components/providers/PreferencesProvider";
import { api, ClientApiError } from "@/lib/api-client";
import { LIABILITY_DISCLAIMER } from "@/lib/legal";
import { COUNTRIES, type CountryCode, SUPPORTED_COUNTRIES, isSupportedCountry } from "@/lib/postcode";
import type { MessageKey } from "@/i18n";
import { PostcodeLookup, type VerifiedLocation } from "./PostcodeLookup";

type Category = { id: string; slug: string; name: string };
type Errors = Record<string, string>;

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[0-9 ()-]{7,20}$/;

export function RegisterForm({ initialType, categories }: { initialType: "customer" | "trader"; categories: Category[] }) {
  const { t, locale, country: visitorCountry } = usePrefs();
  const [type, setType] = useState(initialType);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | { status?: string }>(null);
  // Businesses must enter a postal code that resolves to a real place before
  // the rest of their details can be filled in or submitted.
  const [location, setLocation] = useState<VerifiedLocation | null>(null);
  // Businesses register in the visitor's own market by default.
  const [postalCountry, setPostalCountry] = useState<CountryCode>(
    isSupportedCountry(visitorCountry) ? visitorCountry : SUPPORTED_COUNTRIES[0] ?? "US",
  );
  const locked = type === "trader" && !location;
  const postalLabel = t(`register.postalLabels.${postalCountry}`);

  const sortedCategories = useMemo(
    () =>
      categories
        .map((c) => ({ ...c, label: t.maybe(`categories.names.${c.slug}`, c.name) }))
        .sort((a, b) => a.label.localeCompare(b.label, locale)),
    [categories, t, locale],
  );

  // Same rules as the server, checked here so messages show in the visitor's language.
  const validate = (f: FormData): Errors => {
    const str = (k: string) => String(f.get(k) ?? "").trim();
    const e: Record<string, MessageKey> = {};
    if (!str("name")) e.name = "register.errors.required";
    if (!EMAIL.test(str("email"))) e.email = "register.errors.email";
    const pw = str("password");
    if (pw.length < 12 || !/[a-z]/i.test(pw) || !/\d/.test(pw)) e.password = "register.errors.password";
    if (type === "trader") {
      if (str("businessName").length < 2) e.businessName = "register.errors.required";
      if (!PHONE.test(str("phone"))) e.phone = "register.errors.phone";
      if (!str("categoryId")) e.categoryId = "register.errors.category";
    }
    if (f.get("acceptTerms") !== "on") e.acceptTerms = "register.errors.terms";
    return Object.fromEntries(Object.entries(e).map(([k, key]) => [k, t(key)]));
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const str = (k: string) => String(f.get(k) ?? "").trim();
    const invalid = validate(f);
    setErrors(invalid);
    setFormError("");
    if (Object.keys(invalid).length) {
      setFormError(t("register.errors.fix"));
      return;
    }
    const payload: Record<string, unknown> = {
      accountType: type,
      name: str("name"),
      email: str("email"),
      password: str("password"),
      acceptTerms: true,
      marketingOptIn: f.get("marketingOptIn") === "on",
    };
    if (type === "trader") {
      if (!location) return;
      Object.assign(payload, {
        businessName: str("businessName"),
        phone: str("phone"),
        categoryId: str("categoryId"),
        hourlyRatePence: str("hourlyRate") ? Math.round(Number(str("hourlyRate")) * 100) : undefined,
        // The server re-resolves the postal code; city and coordinates come from there.
        country: location.country,
        postcode: location.postcode,
        serviceRadiusKm: Number(str("serviceRadiusKm") || 25),
        servicePostcodes: str("servicePostcodes").split(/[\s,]+/).filter(Boolean),
      });
    }
    setBusy(true);
    try {
      const res = await api<{ status?: string }>("/api/auth/register", { method: "POST", json: payload });
      await signIn("credentials", { email: payload.email, password: payload.password, redirect: false });
      setDone(res);
    } catch (err) {
      if (!(err instanceof ClientApiError)) {
        setFormError(t("common.somethingWrong"));
      } else if (err.code === "email_taken") {
        setErrors({ email: t("register.errors.emailTaken") });
        setFormError(t("register.errors.fix"));
      } else if (err.code === "postcode_not_found" || err.code === "invalid_postcode") {
        setErrors({ postcode: t("register.notFound", { label: postalLabel }) });
        setLocation(null);
      } else if (err.issues) {
        setErrors(Object.fromEntries(err.issues.map((i) => [i.path, i.message])));
        setFormError(t("register.errors.fix"));
      } else {
        setFormError(err.status === 429 ? err.message : t("common.somethingWrong"));
      }
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="card p-8 text-center" role="status">
        <h1 className="text-xl font-bold">{t("register.welcome")}</h1>
        <p className="mt-2 text-sm text-ink-500">
          {type === "trader" && done.status === "PENDING" ? t("register.pendingApproval") : t("register.ready")}
        </p>
        <Link href={type === "trader" ? "/dashboard" : "/"} className="btn-primary mt-6">{t("register.continue")}</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-5 p-8" noValidate>
      <h1 className="text-xl font-bold">{t("register.title")}</h1>
      <div className="flex rounded-full bg-ink-100 p-1 text-sm" role="tablist">
        {(["customer", "trader"] as const).map((k) => (
          <button key={k} type="button" role="tab" aria-selected={type === k} onClick={() => setType(k)}
            className={`flex-1 rounded-full py-1.5 ${type === k ? "bg-white shadow-card" : "text-ink-500"}`}>
            {k === "customer" ? t("register.customer") : t("register.trader")}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="name" label={t("register.name")} error={errors.name}><input id="name" name="name" required className="input" autoComplete="name" /></Field>
        <Field id="email" label={t("register.email")} error={errors.email}><input id="email" name="email" type="email" required className="input" autoComplete="email" dir="ltr" /></Field>
        <Field id="password" label={t("register.password")} error={errors.password}>
          <input id="password" name="password" type="password" required minLength={12} className="input" autoComplete="new-password" />
        </Field>
      </div>

      {type === "trader" && (
        <div className="space-y-4 border-t border-ink-200 pt-5">
          <h2 className="text-sm font-semibold">{t("register.business")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <PostcodeLookup country={postalCountry} onCountryChange={setPostalCountry} onChange={setLocation} serverError={errors.postcode} />
          </div>
          {/* A disabled fieldset disables every control inside it. */}
          <fieldset disabled={locked} aria-describedby={locked ? "postcode-status" : undefined}
            className={`grid gap-4 transition sm:grid-cols-2 ${locked ? "pointer-events-none opacity-50" : ""}`}>
            <legend className="sr-only">{t("register.business")}</legend>
            <Field id="city" label={t("register.area", { label: postalLabel })}>
              <input id="city" readOnly tabIndex={-1} value={location ? [location.city, location.region].filter((v, i, a) => v && a.indexOf(v) === i).join(", ") : ""}
                placeholder={t("register.areaPlaceholder", { label: postalLabel })} className="input bg-ink-100" />
            </Field>
            <Field id="businessName" label={t("register.businessName")} error={errors.businessName}><input id="businessName" name="businessName" required className="input" /></Field>
            <Field id="phone" label={t("register.phone")} error={errors.phone}><input id="phone" name="phone" type="tel" required className="input" autoComplete="tel" dir="ltr" /></Field>
            <Field id="categoryId" label={t("register.category")} error={errors.categoryId}>
              <select id="categoryId" name="categoryId" required className="input" defaultValue="">
                <option value="" disabled>{t("register.choose")}</option>
                {sortedCategories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </Field>
            <Field id="hourlyRate" label={location ? t("register.hourlyRateIn", { currency: COUNTRIES[location.country].currency }) : t("register.hourlyRate")} error={errors.hourlyRatePence}>
              <input id="hourlyRate" name="hourlyRate" type="number" min={0} step="1" className="input" />
            </Field>
            <Field id="serviceRadiusKm" label={t("register.radius")} error={errors.serviceRadiusKm}><input id="serviceRadiusKm" name="serviceRadiusKm" type="number" min={1} max={300} defaultValue={25} className="input" /></Field>
            <div className="sm:col-span-2">
              <Field id="servicePostcodes" label={t("register.alsoCover")} error={errors.servicePostcodes}>
                <input id="servicePostcodes" name="servicePostcodes" placeholder={location ? COUNTRIES[location.country].areaExample : ""} className="input" dir="ltr" />
              </Field>
            </div>
          </fieldset>
        </div>
      )}

      <div className="space-y-3 border-t border-ink-200 pt-5">
        <div className="max-h-36 overflow-y-auto rounded bg-ink-100 p-3 text-xs leading-relaxed text-ink-700">
          <p>{t("legal.disclaimer")}</p>
          {/* Acceptance is of the English text; show it alongside any translation. */}
          {locale !== "en" && (
            <>
              <p className="mt-2 italic text-ink-500">{t("legal.translationNote")}</p>
              <p className="mt-2" lang="en" dir="ltr">{LIABILITY_DISCLAIMER}</p>
            </>
          )}
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="acceptTerms" required className="mt-1" aria-invalid={!!errors.acceptTerms} />
          <span>
            {t.rich("register.accept", {
              terms: <Link key="terms" href="/terms" target="_blank" className="underline">{t("register.terms")}</Link>,
              privacy: <Link key="privacy" href="/privacy" target="_blank" className="underline">{t("register.privacy")}</Link>,
            })}
          </span>
        </label>
        {errors.acceptTerms && <p className="text-xs text-rose-600">{errors.acceptTerms}</p>}
        <label className="flex items-start gap-2 text-sm text-ink-700">
          <input type="checkbox" name="marketingOptIn" className="mt-1" />
          <span>{t("register.marketing")}</span>
        </label>
      </div>

      {formError && <p role="alert" className="text-sm text-rose-600">{formError}</p>}
      <button type="submit" disabled={busy || locked} className="btn-primary w-full">
        {busy ? t("register.submitting") : locked ? t("register.locked", { label: postalLabel }) : t("register.submit")}
      </button>
    </form>
  );
}
