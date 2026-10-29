import type { PublicBanner } from "@/server/services/banners";
import { AdSlot } from "./AdSlot";

/**
 * Horizontal banner across the top of the content, for screens without room
 * for the side rails: the 320x100 MOBILE banner on phones, the 728x90
 * LEADERBOARD from tablets up. It disappears at the width where the rails
 * appear (`hideFrom`), so a visitor sees one or the other, never both. With
 * no rails at all it stays on every screen.
 */
export function AdBanner({ mobile, leaderboard, hideFrom, label }: {
  mobile?: PublicBanner;
  leaderboard?: PublicBanner;
  hideFrom: "xl" | "2xl" | null;
  label: string;
}) {
  // Phones: the mobile banner, else a leaderboard image (it shrinks to fit; script tags can't).
  const phone = mobile ?? (leaderboard?.kind === "IMAGE" ? leaderboard : undefined);
  const wide = leaderboard ?? mobile;
  if (!phone && !wide) return null;
  const hide = hideFrom === "xl" ? "xl:hidden" : hideFrom === "2xl" ? "2xl:hidden" : "";
  return (
    <aside aria-label={label} className={`mx-auto mt-4 w-full ${hide}`}>
      <p className="mb-1 text-center text-[10px] uppercase tracking-wider text-ink-500">{label}</p>
      {phone && <div className="flex justify-center md:hidden"><AdSlot banner={phone} /></div>}
      {wide && <div className="hidden justify-center md:flex"><AdSlot banner={wide} /></div>}
    </aside>
  );
}
