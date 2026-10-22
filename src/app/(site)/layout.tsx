import type { ReactNode } from "react";

// Pages in this group render their own <SiteShell> so they can pass a
// full-bleed hero above the ad-railed container.
export default function SiteGroupLayout({ children }: { children: ReactNode }) {
  return children;
}
