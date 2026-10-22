import type { ReactNode } from "react";

// Every public page reads live data (session, categories, banner switch), so
// render per request instead of baking database content in at build time.
export const dynamic = "force-dynamic";

// Pages in this group render their own <SiteShell> so they can pass a
// full-bleed hero above the ad-railed container.
export default function SiteGroupLayout({ children }: { children: ReactNode }) {
  return children;
}
