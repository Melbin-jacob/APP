import { LIABILITY_DISCLAIMER, PROFILE_DISCLAIMER_SHORT } from "@/lib/legal";

/** Persistent disclaimer on every trader card (compact) and profile page (full). */
export function LegalDisclaimer({ variant = "full" }: { variant?: "full" | "compact" }) {
  if (variant === "compact") {
    return <p className="border-t border-ink-200 px-3 py-2 text-[10px] leading-snug text-ink-500">{PROFILE_DISCLAIMER_SHORT}</p>;
  }
  return (
    <aside role="note" aria-label="Legal disclaimer" className="rounded-md border border-accent-400/40 bg-accent-400/10 p-4 text-xs leading-relaxed text-ink-700">
      <strong className="mb-1 block text-ink-900">Important</strong>
      {LIABILITY_DISCLAIMER}
    </aside>
  );
}
