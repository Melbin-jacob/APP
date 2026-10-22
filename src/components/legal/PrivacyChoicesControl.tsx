"use client";

import { useEffect, useState } from "react";
import { gpcEnabled, readConsent, writeConsent } from "./CookieConsent";

/** CCPA/CPRA opt-out of sale/sharing for this browser (no account needed). */
export function PrivacyChoicesControl() {
  const [state, setState] = useState<"loading" | "gpc" | "out" | "in">("loading");

  useEffect(() => {
    const c = readConsent();
    setState(gpcEnabled() ? "gpc" : c && !c.ads && !c.analytics ? "out" : "in");
  }, []);

  if (state === "loading") return null;
  if (state === "gpc") {
    return <p role="status" className="rounded-md bg-brand-50 p-4 text-brand-700">Your browser is sending a Global Privacy Control signal. You are opted out on this browser.</p>;
  }
  if (state === "out") {
    return <p role="status" className="rounded-md bg-brand-50 p-4 text-brand-700">You are opted out on this browser. Advertising and analytics cookies are off.</p>;
  }
  return (
    <button
      type="button"
      className="btn-primary"
      onClick={() => {
        writeConsent({ necessary: true, analytics: false, ads: false, v: 1 });
        setState("out");
      }}
    >
      Opt out of sale and sharing on this browser
    </button>
  );
}
