import Link from "next/link";
import { LIABILITY_DISCLAIMER } from "@/lib/legal";
import { Logo } from "./SiteHeader";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-ink-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-3 text-sm text-ink-500">Connecting homeowners with independent local professionals.</p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-2 text-sm">
          <Link href="/categories" className="text-ink-700 hover:text-brand-600">Categories</Link>
          <Link href="/register?type=trader" className="text-ink-700 hover:text-brand-600">List your business</Link>
          <Link href="/terms" className="text-ink-700 hover:text-brand-600">Terms of Service</Link>
          <Link href="/privacy" className="text-ink-700 hover:text-brand-600">Privacy & Cookies</Link>
          <Link href="/account" className="text-ink-700 hover:text-brand-600">Your data</Link>
        </nav>
        <p className="text-xs leading-relaxed text-ink-500">{LIABILITY_DISCLAIMER}</p>
      </div>
      <div className="border-t border-ink-200 py-4 text-center text-xs text-ink-500">
        © {new Date().getFullYear()} HomeServices Direct. All rights reserved.
      </div>
    </footer>
  );
}
