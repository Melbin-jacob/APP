import type { PublicBanner } from "@/server/services/banners";
import { ConsentGate } from "./ConsentGate";

/**
 * Renders one banner. IMAGE banners are a plain link through the click
 * counter (first-party, no tracking cookies). SCRIPT banners (AdSense etc.)
 * load only with advertising consent, in a sandboxed iframe without
 * allow-same-origin, isolating third-party code from the site.
 */
export function AdSlot({ banner }: { banner: PublicBanner }) {
  const style = { width: banner.width, height: banner.height };
  if (banner.kind === "IMAGE" && banner.imageUrl) {
    return (
      <a href={`/api/banners/${banner.id}/click`} rel="sponsored noopener noreferrer" target={banner.internal ? undefined : "_blank"} className="block overflow-hidden rounded-md shadow-card" style={style}>
        {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary advertiser hosts */}
        <img src={banner.imageUrl} alt={banner.name} width={banner.width} height={banner.height} className="h-full w-full object-cover" loading="lazy" />
      </a>
    );
  }
  return (
    <ConsentGate fallback={<div style={style} className="rounded-md border border-dashed border-ink-200" aria-hidden="true" />}>
      <iframe
        title={`Advertisement: ${banner.name}`}
        src={`/api/banners/${banner.id}/frame`}
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer"
        loading="lazy"
        style={style}
        className="rounded-md border-0 bg-white"
      />
    </ConsentGate>
  );
}
