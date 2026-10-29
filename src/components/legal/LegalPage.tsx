import Link from "next/link";
import type { ReactNode } from "react";
import { SiteShell } from "@/components/layout/SiteShell";
import { LEGAL_UPDATED } from "@/lib/legal";
import { EnglishOnlyNotice } from "./EnglishOnlyNotice";

export const LEGAL_DOCS = [
  { href: "/legal", title: "Legal centre" },
  { href: "/terms", title: "Terms of Service" },
  { href: "/privacy", title: "Privacy Policy" },
  { href: "/legal/cookies", title: "Cookie Policy" },
  { href: "/legal/privacy-choices", title: "Do Not Sell or Share My Personal Information" },
  { href: "/legal/privacy-rights", title: "Your Privacy Rights" },
  { href: "/legal/disclaimer", title: "Legal Disclaimer" },
  { href: "/legal/accessibility", title: "Accessibility Statement" },
  { href: "/legal/security", title: "Security & Vulnerability Disclosure" },
  { href: "/legal/copyright", title: "Copyright & DMCA Policy" },
] as const;

/**
 * Shared shell for legal documents. Legal text is English-only until it is
 * professionally translated, so the article is marked lang="en" / ltr.
 */
export function LegalPage({ title, current, children }: { title: string; current: string; children: ReactNode }) {
  return (
    <SiteShell>
      <EnglishOnlyNotice />
      <div className="my-10 grid gap-6 lg:grid-cols-[16rem_1fr]">
        <nav aria-label="Legal documents" className="card h-fit p-4 text-sm lg:sticky lg:top-24" lang="en" dir="ltr">
          <ul className="space-y-1">
            {LEGAL_DOCS.map((d) => (
              <li key={d.href}>
                <Link
                  href={d.href}
                  aria-current={d.href === current ? "page" : undefined}
                  className={`block rounded px-2 py-1.5 ${d.href === current ? "bg-brand-50 font-semibold text-brand-700" : "text-ink-700 hover:bg-ink-100"}`}
                >
                  {d.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <article lang="en" dir="ltr" className="legal card min-w-0 space-y-4 p-6 text-sm leading-relaxed text-ink-700 sm:p-8">
          <header>
            <h1 className="text-2xl font-bold text-ink-900">{title}</h1>
            <p className="mt-1 text-xs text-ink-500">Last updated {LEGAL_UPDATED}</p>
          </header>
          {children}
        </article>
      </div>
    </SiteShell>
  );
}
