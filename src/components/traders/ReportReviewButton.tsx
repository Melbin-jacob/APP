"use client";

import { useState } from "react";
import { useT } from "@/components/providers/PreferencesProvider";
import { api } from "@/lib/api-client";

const REASONS = ["SPAM", "FAKE", "OFFENSIVE", "CONFLICT_OF_INTEREST", "OTHER"] as const;

export function ReportReviewButton({ reviewId }: { reviewId: string }) {
  const t = useT();
  const [state, setState] = useState<"idle" | "choosing" | "sent">("idle");
  if (state === "sent") return <span>{t("profile.reported")}</span>;
  if (state === "idle") return <button type="button" className="underline" onClick={() => setState("choosing")}>{t("profile.report")}</button>;
  return (
    <select
      aria-label={t("profile.reportReason")}
      className="rounded border border-ink-200 bg-white px-1 py-0.5"
      defaultValue=""
      onChange={async (e) => {
        if (!e.target.value) return;
        await api(`/api/reviews/${reviewId}/report`, { method: "POST", json: { reason: e.target.value } }).catch(() => {});
        setState("sent");
      }}
    >
      <option value="" disabled>{t("profile.reportWhy")}</option>
      {REASONS.map((r) => <option key={r} value={r}>{t(`profile.reasons.${r}`)}</option>)}
    </select>
  );
}
