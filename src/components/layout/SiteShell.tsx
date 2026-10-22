import type { ReactNode } from "react";
import { AdRail } from "@/components/ads/AdRail";
import { PreferencesBar } from "@/components/prefs/PreferencesBar";
import { getI18n } from "@/i18n/server";
import { getSideBanners } from "@/server/services/banners";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/**
 * Public layout wrapper:
 *
 *   <PreferencesBar/>                ← market · language · currency
 *   <SiteHeader/>
 *   {fullBleed}                      ← hero etc., edge to edge
 *   [AdRail L] <main/> [AdRail R]    ← rails vanish when the admin switch is off
 *   <SiteFooter/>
 */
export async function SiteShell({ children, fullBleed }: { children: ReactNode; fullBleed?: ReactNode }) {
  const [banners, { t, visitor }] = await Promise.all([
    getSideBanners().catch(() => ({}) as Awaited<ReturnType<typeof getSideBanners>>),
    getI18n(),
  ]);
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:start-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        {t("common.skipToContent")}
      </a>
      <PreferencesBar outsideMarkets={visitor.outsideMarkets} />
      <SiteHeader />
      {fullBleed}
      <div className="mx-auto flex w-full max-w-[1720px] flex-1 justify-center gap-6 px-4">
        <AdRail side="left" banner={banners.LEFT} label={t("common.advertisement")} />
        <main id="main" className="w-full min-w-0 max-w-6xl">{children}</main>
        <AdRail side="right" banner={banners.RIGHT} label={t("common.advertisement")} />
      </div>
      <SiteFooter />
    </div>
  );
}
