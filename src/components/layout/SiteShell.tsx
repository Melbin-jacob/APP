import type { ReactNode } from "react";
import { AdRail } from "@/components/ads/AdRail";
import { getSideBanners } from "@/server/services/banners";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/**
 * Public layout wrapper:
 *
 *   <SiteHeader/>
 *   {fullBleed}                      ← hero etc., edge to edge
 *   [AdRail L] <main/> [AdRail R]    ← rails vanish when the admin switch is off
 *   <SiteFooter/>
 */
export async function SiteShell({ children, fullBleed }: { children: ReactNode; fullBleed?: ReactNode }) {
  const banners = await getSideBanners().catch(() => ({}) as Awaited<ReturnType<typeof getSideBanners>>);
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <SiteHeader />
      {fullBleed}
      <div className="mx-auto flex w-full max-w-[1720px] flex-1 justify-center gap-6 px-4">
        <AdRail side="left" banner={banners.LEFT} />
        <main id="main" className="w-full min-w-0 max-w-6xl">{children}</main>
        <AdRail side="right" banner={banners.RIGHT} />
      </div>
      <SiteFooter />
    </div>
  );
}
