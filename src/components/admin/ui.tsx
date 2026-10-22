import type { ReactNode } from "react";

export function PageTitle({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-xl font-bold">{children}</h1>
      {actions}
    </div>
  );
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: "warn" }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-ink-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone === "warn" ? "text-accent-600" : "text-ink-900"}`}>{value}</p>
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "good" | "bad" | "warn" | "neutral" }) {
  const cls = { good: "bg-brand-50 text-brand-700", bad: "bg-rose-50 text-rose-700", warn: "bg-accent-400/20 text-accent-600", neutral: "bg-ink-100 text-ink-700" }[tone];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}

export const statusTone = (s: string) =>
  (["APPROVED", "ACTIVE", "PUBLISHED", "VERIFIED"].includes(s) ? "good" : ["PENDING", "PENDING_MODERATION"].includes(s) ? "warn" : "bad") as
    "good" | "warn" | "bad";
