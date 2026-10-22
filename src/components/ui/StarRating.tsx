"use client";

import { useT } from "@/components/providers/PreferencesProvider";
import { cn } from "@/lib/format";

/** Read-only 0–5 star display with fractional fill. */
export function StarRating({ value, count, size = "sm" }: { value: number; count?: number; size?: "sm" | "md" }) {
  const t = useT();
  const pct = Math.max(0, Math.min(5, value)) * 20;
  const px = size === "sm" ? "text-sm" : "text-xl";
  const rating = value.toFixed(1);
  return (
    <span
      className="inline-flex items-center gap-1.5"
      role="img"
      aria-label={count != null ? t("card.ratedWithCount", { rating, count }) : t("card.rated", { rating })}
    >
      <span className={cn("relative inline-block leading-none tracking-wider", px)} aria-hidden="true">
        <span className="text-ink-200">★★★★★</span>
        <span className="absolute inset-0 overflow-hidden text-accent-500" style={{ width: `${pct}%` }}>★★★★★</span>
      </span>
      {count != null && <span className="text-xs text-ink-500" aria-hidden="true">({count})</span>}
    </span>
  );
}
