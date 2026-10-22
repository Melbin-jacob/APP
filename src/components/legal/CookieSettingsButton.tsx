"use client";

import { openCookieSettings } from "./CookieConsent";

export function CookieSettingsButton({ label, className }: { label: string; className?: string }) {
  return (
    <button type="button" onClick={openCookieSettings} className={className}>
      {label}
    </button>
  );
}
