"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useT } from "@/components/providers/PreferencesProvider";
import { COOKIE_POLICY_VERSION } from "@/lib/legal";

const COOKIE = "hsd_consent";
const OPEN_EVENT = "open-cookie-settings";

/** id: random, per browser; links this choice to its server-side consent record. */
export type Consent = { necessary: true; analytics: boolean; ads: boolean; gpc?: boolean; v: 1; id?: string; pv?: string };

/** Global Privacy Control: a legally binding opt-out of sale/sharing in California and other US states. */
export const gpcEnabled = () =>
  typeof navigator !== "undefined" && (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;

/** Re-opens the banner (footer "Cookie settings" link). */
export const openCookieSettings = () => window.dispatchEvent(new Event(OPEN_EVENT));

export function readConsent(): Consent | null {
  const raw = document.cookie.split("; ").find((c) => c.startsWith(`${COOKIE}=`))?.split("=")[1];
  try {
    return raw ? (JSON.parse(decodeURIComponent(raw)) as Consent) : null;
  } catch {
    return null;
  }
}

export function writeConsent(input: Consent) {
  const consent: Consent = { ...input, id: input.id ?? readConsent()?.id ?? crypto.randomUUID(), pv: COOKIE_POLICY_VERSION };
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify(consent))}; Max-Age=${60 * 60 * 24 * 180}; Path=/; SameSite=Lax${secure}`;
  window.dispatchEvent(new CustomEvent("consent-change", { detail: consent }));
  // Proof of consent (GDPR Art. 7(1)): record the choice server-side. Best effort;
  // the cookie alone already controls what loads.
  fetch("/api/consent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subjectId: consent.id, analytics: consent.analytics, ads: consent.ads, gpc: !!consent.gpc, policyVersion: consent.pv }),
    keepalive: true,
  }).catch(() => {});
}

/**
 * Consent banner (GDPR/ePrivacy, Quebec Law 25, CCPA/CPRA): nothing
 * non-essential runs until the visitor opts in, and "Reject" is as prominent
 * as "Accept". A Global Privacy Control signal is applied automatically as an
 * opt-out of advertising and analytics; the visitor can't override it here.
 */
export function CookieConsent() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [ads, setAds] = useState(false);

  const [gpc, setGpc] = useState(false);

  useEffect(() => {
    const signal = gpcEnabled();
    setGpc(signal);
    const current = readConsent();
    if (signal && (!current || current.ads || current.analytics)) {
      // Honour GPC without asking: record the opt-out and skip the banner.
      writeConsent({ necessary: true, analytics: false, ads: false, gpc: true, v: 1 });
    } else if (!current) {
      setOpen(true);
    }
    const reopen = () => {
      const c = readConsent();
      setAnalytics(!!c?.analytics);
      setAds(!!c?.ads);
      setCustom(true);
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, reopen);
    return () => window.removeEventListener(OPEN_EVENT, reopen);
  }, []);
  if (!open) return null;

  const save = (c: Omit<Consent, "necessary" | "v">) => {
    writeConsent({ necessary: true, v: 1, ...(gpc ? { analytics: false, ads: false, gpc: true } : c) });
    setOpen(false);
  };

  return (
    <div role="dialog" aria-modal="false" aria-labelledby="cc-title" className="fixed inset-x-0 bottom-0 z-50 border-t border-ink-200 bg-white p-4 shadow-2xl">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-ink-700">
          <p id="cc-title" className="font-semibold text-ink-900">{t("cookies.title")}</p>
          <p>
            {t("cookies.body")}{" "}
            <Link href="/legal/cookies" className="underline">{t("cookies.learnMore")}</Link>
          </p>
          {gpc && <p className="mt-1 font-medium text-brand-700">{t("cookies.gpc")}</p>}
          {custom && (
            <div className="mt-2 flex flex-wrap gap-4">
              <label className="flex items-center gap-2"><input type="checkbox" checked disabled /> {t("cookies.essential")}</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={analytics && !gpc} disabled={gpc} onChange={(e) => setAnalytics(e.target.checked)} /> {t("cookies.analytics")}</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={ads && !gpc} disabled={gpc} onChange={(e) => setAds(e.target.checked)} /> {t("cookies.ads")}</label>
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {custom ? (
            <button className="btn-primary" onClick={() => save({ analytics, ads })}>{t("cookies.save")}</button>
          ) : (
            <button className="btn-ghost" onClick={() => setCustom(true)}>{t("cookies.customise")}</button>
          )}
          <button className="btn-ghost" onClick={() => save({ analytics: false, ads: false })}>{t("cookies.rejectAll")}</button>
          <button className="btn-primary" onClick={() => save({ analytics: true, ads: true })}>{t("cookies.acceptAll")}</button>
        </div>
      </div>
    </div>
  );
}
