"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { usePrefs } from "@/components/providers/PreferencesProvider";
import { AddressAutocomplete } from "@/components/forms/AddressAutocomplete";
import { api, ClientApiError } from "@/lib/api-client";
import { CONTACT_TIMES, PHONE_PATTERN, QUOTE_LIMITS as L, type ContactTime } from "@/lib/quotes";

type Props = {
  slug: string;
  businessName: string;
  claimed: boolean;
  country: "US" | "CA" | "GB";
  defaults: { name: string; email: string; phone: string; addressLine: string; city: string; postcode: string };
  /** Roughly where the business is, so address suggestions start nearby. */
  near?: { latitude: number; longitude: number } | null;
};

export function QuoteForm({ slug, businessName, claimed, country, defaults, near }: Props) {
  const { t } = usePrefs();
  const label = t(`register.postalLabels.${country}`);
  const [f, setF] = useState({
    ...defaults, description: "", contactNote: "", website: "",
  });
  const [times, setTimes] = useState<ContactTime[]>([]);
  const [consent, setConsent] = useState(false);
  const [tried, setTried] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => { setF((v) => ({ ...v, [k]: e.target.value })); m.reset(); };

  const m = useMutation({
    mutationFn: () =>
      api<{ ok: true; sentToBusiness: boolean }>(`/api/traders/${slug}/quotes`, {
        method: "POST",
        json: { ...f, email: f.email.trim() || undefined, contactNote: f.contactNote.trim() || undefined, contactTimes: times, consent: true },
      }),
  });

  const problems = {
    phone: f.phone.trim() !== "" && !PHONE_PATTERN.test(f.phone.trim()),
    description: f.description.trim().length < L.descriptionMin,
    times: times.length === 0,
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!problems.phone && !problems.description && !problems.times && consent) m.mutate();
  };

  if (m.isSuccess) {
    return (
      <div className="card space-y-3 p-6 text-center" role="status">
        <p className="text-3xl" aria-hidden="true">✓</p>
        <h2 className="text-lg font-semibold">{t("quote.successTitle")}</h2>
        <p className="text-sm text-ink-700">{t(m.data.sentToBusiness ? "quote.successClaimed" : "quote.successUnclaimed", { name: businessName })}</p>
        {f.email.trim() && <p className="text-sm text-ink-500">{t("quote.successEmail")}</p>}
        <Link href={`/traders/${slug}`} className="btn-ghost inline-flex">{t("quote.back", { name: businessName })}</Link>
      </div>
    );
  }

  const err = m.error instanceof ClientApiError
    ? m.error.code === "invalid_postcode" ? t(`register.postalHints.${country}`)
      : m.error.status === 429 ? m.error.message
      : m.error.code === "validation_error" ? t("register.errors.fix")
      : t("common.somethingWrong")
    : m.error ? t("common.somethingWrong") : "";

  return (
    <form onSubmit={submit} className="space-y-6" noValidate={false}>
      {!claimed && <p className="rounded-md bg-sky-50 p-4 text-sm text-sky-900">{t("quote.unclaimedNote", { name: businessName })}</p>}

      <section className="card space-y-4 p-6" aria-labelledby="q-details">
        <h2 id="q-details" className="font-semibold">{t("quote.yourDetails")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="q-name" label={t("quote.name")}>
            <input id="q-name" required minLength={2} maxLength={L.name} value={f.name} onChange={set("name")} className="input" autoComplete="name" />
          </Field>
          <Field id="q-phone" label={t("quote.phone")} error={tried && problems.phone ? t("register.errors.phone") : ""}>
            <input id="q-phone" type="tel" required maxLength={L.phone} value={f.phone} onChange={set("phone")} className="input" autoComplete="tel" dir="ltr" aria-invalid={tried && problems.phone} />
          </Field>
          <Field id="q-email" label={t("quote.email")} className="sm:col-span-2">
            <input id="q-email" type="email" maxLength={254} value={f.email} onChange={set("email")} className="input" autoComplete="email" dir="ltr" />
          </Field>
          <Field id="q-address" label={t("quote.address")} hint={t("quote.addressHint")} className="sm:col-span-2">
            <AddressAutocomplete id="q-address" required minLength={3} maxLength={L.address} value={f.addressLine} className="input"
              country={country} near={near}
              onChange={(v) => { setF((x) => ({ ...x, addressLine: v })); m.reset(); }}
              onSelect={(a) => { setF((x) => ({ ...x, addressLine: a.addressLine, city: a.city || x.city, postcode: a.postcode || x.postcode })); m.reset(); }} />
          </Field>
          <Field id="q-city" label={t("quote.city")}>
            <input id="q-city" required minLength={2} maxLength={L.city} value={f.city} onChange={set("city")} className="input" autoComplete="address-level2" />
          </Field>
          <Field id="q-postcode" label={label.charAt(0).toUpperCase() + label.slice(1)}>
            <input id="q-postcode" required maxLength={10} value={f.postcode} onChange={set("postcode")} className="input uppercase" autoComplete="postal-code" dir="ltr" />
          </Field>
        </div>
      </section>

      <section className="card space-y-4 p-6" aria-labelledby="q-job">
        <h2 id="q-job" className="font-semibold">{t("quote.job")}</h2>
        <Field id="q-desc" label={t("quote.description")} hint={t("quote.descriptionHint")} error={tried && problems.description ? t("quote.descriptionShort") : ""}>
          <textarea id="q-desc" required rows={6} maxLength={L.description} value={f.description} onChange={set("description")} className="input" aria-invalid={tried && problems.description} />
        </Field>
        <div role="group" aria-labelledby="q-times-label">
          <p id="q-times-label" className="label">{t("quote.contactTimes")}</p>
          <div className="flex flex-wrap gap-2">
            {CONTACT_TIMES.map((c) => {
              const on = times.includes(c);
              return (
                <label key={c} className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm ${on ? "border-brand-500 bg-brand-50 text-brand-700" : "border-ink-200 bg-white text-ink-700 hover:bg-ink-100"}`}>
                  <input type="checkbox" className="sr-only" checked={on} onChange={() => { setTimes((ts) => (on ? ts.filter((x) => x !== c) : [...ts, c])); m.reset(); }} />
                  {on && "✓ "}{t(`quote.times.${c}`)}
                </label>
              );
            })}
          </div>
          {tried && problems.times && <p role="alert" className="mt-1 text-xs text-rose-600">{t("quote.pickTime")}</p>}
        </div>
        <Field id="q-note" label={t("quote.contactNote")}>
          <input id="q-note" maxLength={L.note} value={f.contactNote} onChange={set("contactNote")} className="input" placeholder={t("quote.contactNotePlaceholder")} />
        </Field>
        {/* Honeypot for bots; hidden from people and assistive tech. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label htmlFor="q-website">Website</label>
          <input id="q-website" tabIndex={-1} autoComplete="off" value={f.website} onChange={set("website")} />
        </div>
      </section>

      <div className="space-y-4">
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
          <span>
            {t.rich("quote.consent", {
              name: <strong key="n">{businessName}</strong>,
              privacy: <Link key="p" href="/privacy" className="text-brand-700 underline" target="_blank">{t("register.privacy")}</Link>,
            })}
          </span>
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn-primary" disabled={m.isPending}>{m.isPending ? t("quote.sending") : t("quote.submit")}</button>
          <Link href={`/traders/${slug}`} className="text-sm text-ink-500 underline">{t("business.cancel")}</Link>
        </div>
        {err && <p role="alert" className="text-sm text-rose-600">{err}</p>}
      </div>
    </form>
  );
}

function Field({ id, label, hint, error, className, children }: { id: string; label: string; hint?: string; error?: string; className?: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="label">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
      {error && <p role="alert" className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
