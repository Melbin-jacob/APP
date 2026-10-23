"use client";

import { signOut } from "next-auth/react";

// The ops console is English-only, so this doesn't use the site's translations.
export function AdminSignOut({ className = "" }: { className?: string }) {
  return (
    <button type="button" onClick={() => signOut({ callbackUrl: "/login" })} className={className}>
      Sign out
    </button>
  );
}
