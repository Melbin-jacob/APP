import type { PublicBanner } from "@/server/services/banners";
import { AdSlot } from "./AdSlot";

/**
 * Sticky skyscraper column flanking the main container. Only shown at xl+
 * where there's room for 160px (or 300px at 2xl) beside the 1152px content.
 */
export function AdRail({ banner, side }: { banner?: PublicBanner; side: "left" | "right" }) {
  if (!banner) return null;
  const visibility = banner.width > 160 ? "hidden 2xl:block" : "hidden xl:block";
  return (
    <aside aria-label={`Sponsored (${side})`} className={`${visibility} shrink-0`} style={{ width: banner.width }}>
      <div className="sticky top-24">
        <p className="mb-1 text-center text-[10px] uppercase tracking-wider text-ink-500">Advertisement</p>
        <AdSlot banner={banner} />
      </div>
    </aside>
  );
}
