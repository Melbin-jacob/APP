"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";

const REASONS = [
  ["SPAM", "Spam"],
  ["FAKE", "Fake review"],
  ["OFFENSIVE", "Offensive"],
  ["CONFLICT_OF_INTEREST", "Conflict of interest"],
  ["OTHER", "Other"],
] as const;

export function ReportReviewButton({ reviewId }: { reviewId: string }) {
  const [state, setState] = useState<"idle" | "choosing" | "sent">("idle");
  if (state === "sent") return <span>Reported — thank you</span>;
  if (state === "idle") return <button type="button" className="underline" onClick={() => setState("choosing")}>Report</button>;
  return (
    <select
      aria-label="Reason for report"
      className="rounded border border-ink-200 bg-white px-1 py-0.5"
      defaultValue=""
      onChange={async (e) => {
        if (!e.target.value) return;
        await api(`/api/reviews/${reviewId}/report`, { method: "POST", json: { reason: e.target.value } }).catch(() => {});
        setState("sent");
      }}
    >
      <option value="" disabled>Why?</option>
      {REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}
