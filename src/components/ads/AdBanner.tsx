import type { BannerSet, PublicBanner } from "@/server/services/banners";
import { AdSlot } from "./AdSlot";
import { railBreakpoint } from "./AdRail";

/**
 * Horizontal banner across the top of the content, for screens without room
 * for the side rails: the 320x100 MOBILE banner on phones, the 728x90
 * LEADERBOARD from tablets up. It disappears at the width where the rails
 * appear (`hideFrom`), so a visitor sees one or the other, never both. With
 * no rails at all it stays on every screen.
 */
export function AdBanner({ mobile, leaderboard, hideFrom, label, placement = "top", className = "mx-auto mt-4 w-full" }: {
  mobile?: PublicBanner;
  leaderboard?: PublicBanner;
  hideFrom: "xl" | "2xl" | null;
  label: string;
  placement?: "top" | "listings";
  className?: string;
}) {
  // Phones: the mobile banner, else a leaderboard image (it shrinks to fit; script tags can't).
  const phone = mobile ?? (leaderboard?.kind === "IMAGE" ? leaderboard : undefined);
  const wide = leaderboard ?? mobile;
  if (!phone && !wide) return null;
  const hide = hideFrom === "xl" ? "xl:hidden" : hideFrom === "2xl" ? "2xl:hidden" : "";
  return (
    // Named like the rails ("Advertisement (left)"): ad blockers hide regions labelled exactly "Advertisement".
    <aside aria-label={`${label} (${placement})`} className={`${className} ${hide}`}>
      <p className="mb-1 text-center text-[10px] uppercase tracking-wider text-ink-500">{label}</p>
      {phone && <div className="flex justify-center md:hidden"><AdSlot banner={phone} /></div>}
      {wide && <div className="hidden justify-center md:flex"><AdSlot banner={wide} /></div>}
    </aside>
  );
}

/**
 * The second phone / tablet banner, placed among listings as a full-width grid
 * item (see withFeedAd). Hidden wherever the side rails show.
 */
export function FeedAd({ banners, label }: { banners: BannerSet; label: string }) {
  return (
    <AdBanner mobile={banners.feed?.MOBILE} leaderboard={banners.feed?.LEADERBOARD} label={label}
      hideFrom={railBreakpoint(banners.LEFT, banners.RIGHT)} placement="listings" className="col-span-full w-full py-2" />
  );
}
