import type { PublicBanner } from "@/server/services/banners";

/**
 * Renders one banner. IMAGE banners are a plain link through the click
 * counter. SCRIPT banners (AdSense etc.) load in a sandboxed iframe without
 * allow-same-origin, isolating third-party code from the site.
 */
export function AdSlot({ banner }: { banner: PublicBanner }) {
  const style = { width: banner.width, height: banner.height };
  if (banner.kind === "IMAGE" && banner.imageUrl) {
    return (
      <a href={`/api/banners/${banner.id}/click`} rel="sponsored noopener" target="_blank" className="block overflow-hidden rounded-md shadow-card" style={style}>
        {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary advertiser hosts */}
        <img src={banner.imageUrl} alt={banner.name} width={banner.width} height={banner.height} className="h-full w-full object-cover" loading="lazy" />
      </a>
    );
  }
  return (
    <iframe
      title={`Advertisement: ${banner.name}`}
      src={`/api/banners/${banner.id}/frame`}
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
      referrerPolicy="no-referrer"
      loading="lazy"
      style={style}
      className="rounded-md border-0 bg-white"
    />
  );
}
