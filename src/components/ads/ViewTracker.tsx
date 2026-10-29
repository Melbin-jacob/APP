"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Reports one impression when at least half of the banner has been on screen
 * (the usual viewability rule). Banners hidden by CSS for this screen size
 * never intersect, so they're never counted.
 */
export function ViewTracker({ bannerId, children }: { bannerId: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        fetch(`/api/banners/${bannerId}/view`, { method: "POST", keepalive: true }).catch(() => {});
      }
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [bannerId]);
  return <div ref={ref} className="max-w-full">{children}</div>;
}
