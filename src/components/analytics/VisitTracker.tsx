"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Reports each public page view for the daily visitor count. No cookies or
// identifiers are sent: only the path. Staff pages aren't counted.
export function VisitTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    fetch("/api/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);
  return null;
}
