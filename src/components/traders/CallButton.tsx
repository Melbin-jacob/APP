"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { api } from "@/lib/api-client";

/**
 * Click-to-call. The number is fetched on click (logged as a CallEvent and
 * swapped for a tracking number when one is provisioned), then dialled.
 */
export function CallButton({ slug, className }: { slug: string; className?: string }) {
  const [display, setDisplay] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    if (display) return;
    setBusy(true);
    try {
      const { tel, display: shown } = await api<{ tel: string; display: string }>(`/api/traders/${slug}/call`, { method: "POST" });
      setDisplay(shown);
      window.location.href = tel;
    } catch {
      setDisplay("Unavailable");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" onClick={onClick} disabled={busy} className={className}>
      <Icon name="phone" className="h-3.5 w-3.5" />
      {display ?? "Call Now"}
    </button>
  );
}
