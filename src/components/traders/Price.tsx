"use client";

import { usePrefs, usePrice } from "@/components/providers/PreferencesProvider";

/**
 * A professional's price in the visitor's currency. Converted amounts are
 * marked ≈ and the original price is shown on hover / to screen readers.
 *
 * The server's and the browser's built-in locale data can differ slightly
 * (e.g. "1234 €" vs "1.234 €"), hence suppressHydrationWarning on the text.
 */
export function Price({ minor, currency, template }: { minor: number | null | undefined; currency: string; template?: (price: string) => string }) {
  const { t } = usePrefs();
  const price = usePrice()(minor, currency);
  if (!price) return null;
  const text = template ? template(price.text) : price.text;
  if (!price.converted) return <span suppressHydrationWarning>{text}</span>;
  const note = t("card.convertedNote", { original: price.original });
  return (
    <span title={note} className="cursor-help underline decoration-dotted underline-offset-2" suppressHydrationWarning>
      <span suppressHydrationWarning>{text}</span>
      <span className="sr-only" suppressHydrationWarning> ({note})</span>
    </span>
  );
}
