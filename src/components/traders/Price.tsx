"use client";

import { usePrefs, usePrice } from "@/components/providers/PreferencesProvider";
import type { MessageKey } from "@/i18n";

/**
 * A professional's price in the visitor's currency. Converted amounts are
 * marked ≈ and the original price is shown on hover / to screen readers.
 *
 * The server's and the browser's built-in locale data can differ slightly
 * (e.g. "1234 €" vs "1.234 €"), hence suppressHydrationWarning on the text.
 */
/**
 * `label` is a message with a {price} placeholder (e.g. "card.perHour"). It's a
 * key rather than a function so server components can render <Price> too.
 */
export function Price({ minor, currency, label }: { minor: number | null | undefined; currency: string; label?: MessageKey }) {
  const { t } = usePrefs();
  const price = usePrice()(minor, currency);
  if (!price) return null;
  const text = label ? t(label, { price: price.text }) : price.text;
  if (!price.converted) return <span suppressHydrationWarning>{text}</span>;
  const note = t("card.convertedNote", { original: price.original });
  return (
    <span title={note} className="cursor-help underline decoration-dotted underline-offset-2" suppressHydrationWarning>
      <span suppressHydrationWarning>{text}</span>
      <span className="sr-only" suppressHydrationWarning> ({note})</span>
    </span>
  );
}
