import type { ReactNode } from "react";
import { AdBanner } from "@/components/ads/AdBanner";
import { AdRail, railBreakpoint } from "@/components/ads/AdRail";
import { PreferencesBar } from "@/components/prefs/PreferencesBar";
import { getI18n } from "@/i18n/server";
import { getBanners } from "@/server/services/banners";
import { getMarketCounts } from "@/server/services/catalog";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/**
 * Public layout wrapper:
 *
 *   <PreferencesBar/>                ← market · language · currency
 *   <SiteHeader/>
 *   {fullBleed}                      ← hero etc., edge to edge
 *   [AdRail L] <main/> [AdRail R]    ← rails on wide desktops; on smaller screens an
 *              <AdBanner/> sits at the top of <main/> instead. All vanish when
 *              the admin switch is off.
 *   <SiteFooter/>
 */
export async function SiteShell({ children, fullBleed }: { children: ReactNode; fullBleed?: ReactNode }) {
  const [banners, { t, visitor }, marketCounts] = await Promise.all([
    getBanners().catch(() => ({}) as Awaited<ReturnType<typeof getBanners>>),
    getI18n(),
    getMarketCounts().catch(() => undefined),
  ]);
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:start-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        {t("common.skipToContent")}
      </a>
      <PreferencesBar outsideMarkets={visitor.outsideMarkets} marketCounts={marketCounts} />
      <SiteHeader />
      {fullBleed}
      <div className="mx-auto flex w-full max-w-[1720px] flex-1 justify-center gap-6 px-4">
        <AdRail side="left" banner={banners.LEFT} label={t("common.advertisement")} />
        <main id="main" className="w-full min-w-0 max-w-6xl">
          <AdBanner mobile={banners.MOBILE} leaderboard={banners.LEADERBOARD} label={t("common.advertisement")}
            hideFrom={railBreakpoint(banners.LEFT, banners.RIGHT)} />
          {children}
        </main>
        <AdRail side="right" banner={banners.RIGHT} label={t("common.advertisement")} />
      </div>
      <SiteFooter />
    </div>
  );
}
