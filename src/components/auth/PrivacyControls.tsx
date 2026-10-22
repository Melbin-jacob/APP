"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";
import { useT } from "@/components/providers/PreferencesProvider";
import { api } from "@/lib/api-client";

// Kept in English in every language: the server checks this exact phrase.
const PHRASE = "DELETE MY ACCOUNT";

export function PrivacyControls() {
  const t = useT();
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const del = async () => {
    try {
      await api("/api/me", { method: "DELETE", json: { confirm } });
      await signOut({ callbackUrl: "/" });
    } catch {
      setError(t("common.somethingWrong"));
    }
  };

  return (
    <section className="card space-y-5 p-6">
      <h2 className="font-semibold">{t("account.data")}</h2>
      <div>
        <p className="text-sm text-ink-700">{t("account.exportBody")}</p>
        <a href="/api/me/export" className="btn-ghost mt-2">{t("account.export")}</a>
      </div>
      <div className="border-t border-ink-200 pt-5">
        <p className="text-sm text-ink-700">{t("account.deleteBody")}</p>
        <label htmlFor="confirm" className="label mt-3">{t.rich("account.deleteConfirm", { phrase: <strong key="p" lang="en">{PHRASE}</strong> })}</label>
        <input id="confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="input" dir="ltr" />
        {error && <p role="alert" className="mt-2 text-sm text-rose-600">{error}</p>}
        <button type="button" disabled={confirm !== PHRASE} onClick={del} className="btn mt-3 bg-rose-600 text-white hover:bg-rose-700">
          {t("account.delete")}
        </button>
      </div>
    </section>
  );
}
