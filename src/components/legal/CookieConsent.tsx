"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useT } from "@/components/providers/PreferencesProvider";

const COOKIE = "hsd_consent";

type Consent = { necessary: true; analytics: boolean; ads: boolean; v: 1 };

function read(): Consent | null {
  const raw = document.cookie.split("; ").find((c) => c.startsWith(`${COOKIE}=`))?.split("=")[1];
  try {
    return raw ? (JSON.parse(decodeURIComponent(raw)) as Consent) : null;
  } catch {
    return null;
  }
}

function write(consent: Consent) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify(consent))}; Max-Age=${60 * 60 * 24 * 180}; Path=/; SameSite=Lax${secure}`;
  window.dispatchEvent(new CustomEvent("consent-change", { detail: consent }));
}

/**
 * GDPR/ePrivacy banner: nothing non-essential runs until the visitor opts in.
 * "Reject" is as prominent as "Accept", as regulators require.
 */
export function CookieConsent() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [ads, setAds] = useState(false);

  useEffect(() => setOpen(!read()), []);
  if (!open) return null;

  const save = (c: Omit<Consent, "necessary" | "v">) => {
    write({ necessary: true, v: 1, ...c });
    setOpen(false);
  };

  return (
    <div role="dialog" aria-modal="false" aria-labelledby="cc-title" className="fixed inset-x-0 bottom-0 z-50 border-t border-ink-200 bg-white p-4 shadow-2xl">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-ink-700">
          <p id="cc-title" className="font-semibold text-ink-900">{t("cookies.title")}</p>
          <p>
            {t("cookies.body")}{" "}
            <Link href="/privacy" className="underline">{t("cookies.learnMore")}</Link>
          </p>
          {custom && (
            <div className="mt-2 flex flex-wrap gap-4">
              <label className="flex items-center gap-2"><input type="checkbox" checked disabled /> {t("cookies.essential")}</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} /> {t("cookies.analytics")}</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={ads} onChange={(e) => setAds(e.target.checked)} /> {t("cookies.ads")}</label>
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
