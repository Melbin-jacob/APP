"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { usePrefs } from "@/components/providers/PreferencesProvider";
import { StarRating } from "@/components/ui/StarRating";
import { api, ClientApiError } from "@/lib/api-client";
import { formatDate } from "@/lib/format";

export function SignOutButton({ className = "btn-ghost" }: { className?: string }) {
  const { t } = usePrefs();
  return <button type="button" className={className} onClick={() => signOut({ callbackUrl: "/" })}>{t("account.signOut")}</button>;
}

type ProfileData = { name: string; email: string; marketingOptIn: boolean; phone: string; addressLine: string; city: string; postcode: string };

export function ProfileForm({ initial }: { initial: ProfileData }) {
  const { t } = usePrefs();
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [marketing, setMarketing] = useState(initial.marketingOptIn);
  const [contact, setContact] = useState({ phone: initial.phone, addressLine: initial.addressLine, city: initial.city, postcode: initial.postcode });
  const setField = (k: keyof typeof contact) => (e: { target: { value: string } }) => { setContact((c) => ({ ...c, [k]: e.target.value })); m.reset(); };
  const m = useMutation({
    mutationFn: () => api("/api/me", { method: "PATCH", json: { name, marketingOptIn: marketing, ...contact } }),
    onSuccess: () => router.refresh(),
  });
  const fieldError = (path: string) =>
    m.error instanceof ClientApiError && m.error.issues?.some((i) => i.path === path) ? m.error.issues.find((i) => i.path === path)!.message : "";
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim()) m.mutate();
  };
  return (
    <form onSubmit={submit} className="card space-y-4 p-6">
      <h2 className="font-semibold">{t("account.profile")}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="acc-name" className="label">{t("account.name")}</label>
          <input id="acc-name" required maxLength={80} value={name} onChange={(e) => { setName(e.target.value); m.reset(); }} className="input" autoComplete="name" />
        </div>
        <div>
          <label htmlFor="acc-email" className="label">{t("account.email")}</label>
          <input id="acc-email" value={initial.email} readOnly className="input bg-ink-100" dir="ltr" />
          <p className="mt-1 text-xs text-ink-500">{t("account.emailNote")}</p>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold">{t("account.contact")}</h3>
        <p className="mt-0.5 text-xs text-ink-500">{t("account.contactHint")}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="acc-phone" className="label">{t("account.phone")}</label>
          <input id="acc-phone" type="tel" maxLength={20} value={contact.phone} onChange={setField("phone")} className="input" autoComplete="tel" dir="ltr" aria-invalid={!!fieldError("phone")} />
          {fieldError("phone") && <p className="mt-1 text-xs text-rose-600">{t("register.errors.phone")}</p>}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="acc-address" className="label">{t("quote.address")}</label>
          <input id="acc-address" maxLength={200} value={contact.addressLine} onChange={setField("addressLine")} className="input" autoComplete="street-address" />
        </div>
        <div>
          <label htmlFor="acc-city" className="label">{t("quote.city")}</label>
          <input id="acc-city" maxLength={80} value={contact.city} onChange={setField("city")} className="input" autoComplete="address-level2" />
        </div>
        <div>
          <label htmlFor="acc-postcode" className="label">{t("account.postcode")}</label>
          <input id="acc-postcode" maxLength={10} value={contact.postcode} onChange={setField("postcode")} className="input uppercase" autoComplete="postal-code" dir="ltr" aria-invalid={!!fieldError("postcode")} />
          {fieldError("postcode") && <p className="mt-1 text-xs text-rose-600">{t("account.postcodeInvalid")}</p>}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={marketing} onChange={(e) => { setMarketing(e.target.checked); m.reset(); }} />
        {t("account.marketing")}
      </label>
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={m.isPending || !name.trim()}>{t("account.save")}</button>
        {m.isSuccess && <span role="status" className="text-sm text-brand-700">✓ {t("account.saved")}</span>}
        {m.isError && <span role="alert" className="text-sm text-rose-600">{m.error instanceof ClientApiError && m.error.code === "validation_error" ? t("register.errors.fix") : t("common.somethingWrong")}</span>}
      </div>
    </form>
  );
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const { t } = usePrefs();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [has, setHas] = useState(hasPassword);
  const weak = next.length > 0 && (next.length < 12 || !/[a-z]/i.test(next) || !/\d/.test(next));
  const m = useMutation({
    mutationFn: () => api("/api/me/password", { method: "POST", json: { currentPassword: has ? current : undefined, newPassword: next } }),
    onSuccess: () => { setCurrent(""); setNext(""); setHas(true); },
  });
  const error = m.error instanceof ClientApiError
    ? m.error.code === "wrong_password" ? t("account.passwordWrong")
      : m.error.status === 429 ? m.error.message
      : m.error.status === 422 ? t("account.passwordWeak")
      : t("common.somethingWrong")
    : m.error ? t("common.somethingWrong") : "";
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!weak && next) m.mutate(); }} className="card space-y-4 p-6">
      <h2 className="font-semibold">{t("account.password")}</h2>
      {!has && <p className="text-sm text-ink-500">{t("account.noPasswordYet")}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {has && (
          <div>
            <label htmlFor="pw-current" className="label">{t("account.currentPassword")}</label>
            <input id="pw-current" type="password" required value={current} onChange={(e) => { setCurrent(e.target.value); m.reset(); }} className="input" autoComplete="current-password" />
          </div>
        )}
        <div>
          <label htmlFor="pw-new" className="label">{t("account.newPassword")}</label>
          <input id="pw-new" type="password" required minLength={12} value={next} onChange={(e) => { setNext(e.target.value); m.reset(); }} className="input" autoComplete="new-password" aria-invalid={weak} />
          {weak && <p className="mt-1 text-xs text-rose-600">{t("account.passwordWeak")}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={m.isPending || weak || !next || (has && !current)}>
          {has ? t("account.changePassword") : t("account.setPassword")}
        </button>
        {m.isSuccess && <span role="status" className="text-sm text-brand-700">✓ {t("account.passwordChanged")}</span>}
        {error && <span role="alert" className="text-sm text-rose-600">{error}</span>}
      </div>
    </form>
  );
}

type MyReview = {
  id: string;
  rating: number;
  comment: string | null;
  status: "PUBLISHED" | "PENDING_MODERATION" | "REMOVED";
  createdAt: string;
  trader: { businessName: string; slug: string };
};

export function MyReviews({ reviews: initial }: { reviews: MyReview[] }) {
  const { t, locale } = usePrefs();
  const [reviews, setReviews] = useState(initial);
  const del = useMutation({
    mutationFn: (id: string) => api(`/api/me/reviews/${id}`, { method: "DELETE" }),
    onSuccess: (_d, id) => setReviews((rs) => rs.map((r) => (r.id === id ? { ...r, status: "REMOVED" } : r))),
  });
  return (
    <section className="card p-6">
      <h2 className="mb-3 font-semibold">{t("account.reviews")}</h2>
      {reviews.length === 0 && <p className="text-sm text-ink-500">{t("account.noReviews")}</p>}
      <ul className="divide-y divide-ink-200">
        {reviews.map((r) => (
          <li key={r.id} className="py-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Link href={`/traders/${r.trader.slug}`} className="font-medium hover:text-brand-600">{r.trader.businessName}</Link>
                <StarRating value={r.rating} />
              </span>
              <span className="flex items-center gap-3 text-xs text-ink-500">
                {formatDate(r.createdAt, locale)} · {t(`account.reviewStatus.${r.status}`)}
                {r.status !== "REMOVED" && (
                  <button
                    type="button"
                    className="text-rose-700 underline"
                    disabled={del.isPending}
                    onClick={() => window.confirm(t("account.confirmDeleteReview")) && del.mutate(r.id)}
                  >
                    {t("account.deleteReview")}
                  </button>
                )}
              </span>
            </div>
            {r.comment && <p className="mt-1 text-ink-700">{r.comment}</p>}
          </li>
        ))}
      </ul>
      {del.isError && <p role="alert" className="mt-2 text-sm text-rose-600">{t("common.somethingWrong")}</p>}
    </section>
  );
}
