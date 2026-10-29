"use client";

import Link from "next/link";
import { useState } from "react";
import { SignOutButton } from "@/components/account/AccountSettings";

export function MobileNav({ items, cta, menuLabel, signOut }: { items: { href: string; label: string }[]; cta?: string; menuLabel: string; signOut?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button
        type="button"
        className="rounded p-2 text-ink-700"
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={menuLabel}
        onClick={() => setOpen((o) => !o)}
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path d={open ? "M6 6l12 12M18 6 6 18" : "M4 7h16M4 12h16M4 17h16"} />
        </svg>
      </button>
      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="absolute inset-x-0 top-16 border-b border-ink-200 bg-white px-4 py-3 shadow-card">
          {items.map((i) => (
            <Link key={i.href} href={i.href} onClick={() => setOpen(false)} className="block py-2 text-sm font-medium text-ink-700">
              {i.label}
            </Link>
          ))}
          {signOut && <SignOutButton className="block w-full py-2 text-start text-sm font-medium text-rose-700" />}
          {cta && (
            <Link href="/register?type=trader" onClick={() => setOpen(false)} className="btn-accent mt-2 w-full">
              {cta}
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
