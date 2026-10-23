import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AdminSignOut } from "@/components/admin/AdminSignOut";
import { Logo } from "@/components/layout/SiteHeader";
import { getPrincipal, requireCurrentTerms } from "@/server/auth";

const NAV = [
  { href: "/admin", label: "Overview", minRole: "ADMIN" },
  { href: "/admin/traders", label: "Traders", minRole: "ADMIN" },
  { href: "/admin/claims", label: "Listing claims", minRole: "ADMIN" },
  { href: "/admin/quotes", label: "Quote requests", minRole: "ADMIN" },
  { href: "/admin/users", label: "Users", minRole: "ADMIN" },
  { href: "/admin/reviews", label: "Reviews", minRole: "ADMIN" },
  { href: "/admin/banners", label: "Ad banners", minRole: "SUPER_ADMIN" },
  { href: "/admin/homepage", label: "Homepage picture", minRole: "SUPER_ADMIN" },
  { href: "/admin/audit", label: "Audit log", minRole: "SUPER_ADMIN" },
] as const;

// Second RBAC gate after middleware: re-checks role + ban status from the DB.
// Non-admins get a 404, not a 403, so the console's existence isn't advertised.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getPrincipal();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) notFound();
  requireCurrentTerms(user, "/admin");
  const nav = NAV.filter((n) => n.minRole === "ADMIN" || user.role === "SUPER_ADMIN");

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 border-r border-ink-200 bg-white p-4 md:block">
        <Logo />
        <p className="mt-6 text-[10px] font-semibold uppercase tracking-widest text-ink-500">Ops console</p>
        <nav className="mt-2 space-y-1" aria-label="Admin">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="block rounded px-3 py-2 text-sm text-ink-700 hover:bg-ink-100">{n.label}</Link>
          ))}
        </nav>
        <div className="mt-8 space-y-3 border-t border-ink-200 pt-4 text-xs text-ink-500">
          <p>{user.email}<br /><span className="font-semibold">{user.role}</span></p>
          <Link href="/" className="block text-brand-700 hover:underline">View website ↗</Link>
          <AdminSignOut className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-100" />
        </div>
      </aside>
      <div className="min-w-0 flex-1 p-6">
        <nav className="mb-4 flex flex-wrap gap-x-4 gap-y-2 text-sm md:hidden" aria-label="Admin mobile">
          {nav.map((n) => <Link key={n.href} href={n.href} className="whitespace-nowrap text-brand-700">{n.label}</Link>)}
          <AdminSignOut className="whitespace-nowrap font-medium text-rose-700" />
        </nav>
        {children}
      </div>
    </div>
  );
}
