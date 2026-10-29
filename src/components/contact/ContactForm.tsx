"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { usePrefs } from "@/components/providers/PreferencesProvider";
import { api, ClientApiError } from "@/lib/api-client";
import { CONTACT_LIMITS as L, CONTACT_TOPICS, type ContactTopic } from "@/lib/contact";
import { PHONE_PATTERN } from "@/lib/quotes";

const EMPTY = { phone: "", topic: "general" as ContactTopic, message: "", website: "" };

export function ContactForm({ defaults }: { defaults: { name: string; email: string } }) {
  const { t } = usePrefs();
  const [f, setF] = useState({ ...defaults, ...EMPTY });
  const [tried, setTried] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => { setF((v) => ({ ...v, [k]: e.target.value })); m.reset(); };

  const m = useMutation({
    mutationFn: () => api("/api/contact", { method: "POST", json: { ...f, phone: f.phone.trim() || undefined } }),
  });
  const problems = {
    phone: f.phone.trim() !== "" && !PHONE_PATTERN.test(f.phone.trim()),
    message: f.message.trim().length < L.messageMin,
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!problems.phone && !problems.message) m.mutate();
  };

  if (m.isSuccess) {
    return (
      <div className="card space-y-3 p-6 text-center" role="status">
        <p className="text-3xl" aria-hidden="true">✓</p>
        <h2 className="text-lg font-semibold">{t("contact.sentTitle")}</h2>
        <p className="text-sm text-ink-700">{t("contact.sentBody", { name: f.name.trim(), email: f.email.trim() })}</p>
        <button type="button" className="btn-ghost" onClick={() => { setF((v) => ({ ...v, ...EMPTY })); setTried(false); m.reset(); }}>
          {t("contact.sendAnother")}
        </button>
      </div>
    );
  }

  const err = m.error instanceof ClientApiError
    ? m.error.status === 429 ? m.error.message
      : m.error.code === "validation_error" ? t("register.errors.fix")
      : t("common.somethingWrong")
    : m.error ? t("common.somethingWrong") : "";

  return (
    <form onSubmit={submit} className="card space-y-4 p-6">
      <h2 className="font-semibold">{t("contact.formTitle")}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="ct-name" label={t("contact.name")}>
          <input id="ct-name" required minLength={2} maxLength={L.name} value={f.name} onChange={set("name")} className="input" autoComplete="name" />
        </Field>
        <Field id="ct-email" label={t("contact.email")} hint={t("contact.emailHint")}>
          <input id="ct-email" type="email" required maxLength={254} value={f.email} onChange={set("email")} className="input" autoComplete="email" dir="ltr" />
        </Field>
        <Field id="ct-phone" label={t("contact.phone")} error={tried && problems.phone ? t("register.errors.phone") : ""}>
          <input id="ct-phone" type="tel" maxLength={L.phone} value={f.phone} onChange={set("phone")} className="input" autoComplete="tel" dir="ltr" aria-invalid={tried && problems.phone} />
        </Field>
        <Field id="ct-topic" label={t("contact.topic")}>
          <select id="ct-topic" value={f.topic} onChange={set("topic")} className="input">
            {CONTACT_TOPICS.map((c) => <option key={c} value={c}>{t(`contact.topics.${c}`)}</option>)}
          </select>
        </Field>
        <Field id="ct-message" label={t("contact.message")} hint={t("contact.messageHint")} className="sm:col-span-2"
          error={tried && problems.message ? t("contact.messageShort") : ""}>
          <textarea id="ct-message" required rows={6} maxLength={L.message} value={f.message} onChange={set("message")} className="input" aria-invalid={tried && problems.message} />
        </Field>
      </div>
      {/* Honeypot for bots; hidden from people and assistive tech. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="ct-website">Website</label>
        <input id="ct-website" tabIndex={-1} autoComplete="off" value={f.website} onChange={set("website")} />
      </div>
      <p className="text-xs text-ink-500">
        {t.rich("contact.privacyNote", {
          privacy: <Link key="p" href="/privacy" className="text-brand-700 underline">{t("register.privacy")}</Link>,
        })}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={m.isPending}>{m.isPending ? t("contact.sending") : t("contact.submit")}</button>
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
