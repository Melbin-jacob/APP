"use client";

import { useEffect, useState, type ReactNode } from "react";
import { gpcEnabled, readConsent, type Consent } from "@/components/legal/CookieConsent";

/**
 * Renders third-party ad code only after the visitor has accepted advertising
 * cookies, and never under a Global Privacy Control signal (Quebec Law 25,
 * GDPR/ePrivacy opt-in; CCPA/CPRA opt-out of sharing). Updates live when the
 * visitor changes their cookie choices.
 */
export function ConsentGate({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const check = () => setAllowed(!gpcEnabled() && readConsent()?.ads === true);
    check();
    const onChange = (e: Event) => setAllowed(!gpcEnabled() && (e as CustomEvent<Consent>).detail?.ads === true);
    window.addEventListener("consent-change", onChange);
    return () => window.removeEventListener("consent-change", onChange);
  }, []);
  return <>{allowed ? children : fallback}</>;
}
