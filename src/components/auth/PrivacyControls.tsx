"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";
import { api, ClientApiError } from "@/lib/api-client";

const PHRASE = "DELETE MY ACCOUNT";

export function PrivacyControls() {
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const del = async () => {
    try {
      await api("/api/me", { method: "DELETE", json: { confirm } });
      await signOut({ callbackUrl: "/" });
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Something went wrong");
    }
  };

  return (
    <section className="card space-y-5 p-6">
      <h2 className="font-semibold">Your data</h2>
      <div>
        <p className="text-sm text-ink-700">Download a copy of everything we hold about you (JSON).</p>
        <a href="/api/me/export" className="btn-ghost mt-2">Export my data</a>
      </div>
      <div className="border-t border-ink-200 pt-5">
        <p className="text-sm text-ink-700">
          Permanently delete your account. Your personal details are erased immediately; reviews you wrote stay but are de-identified.
        </p>
        <label htmlFor="confirm" className="label mt-3">Type <strong>{PHRASE}</strong> to confirm</label>
        <input id="confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="input" />
        {error && <p role="alert" className="mt-2 text-sm text-rose-600">{error}</p>}
        <button type="button" disabled={confirm !== PHRASE} onClick={del} className="btn mt-3 bg-rose-600 text-white hover:bg-rose-700">
          Delete my account
        </button>
      </div>
    </section>
  );
}
