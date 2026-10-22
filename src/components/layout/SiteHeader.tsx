import Link from "next/link";
import { getPrincipal } from "@/server/auth";
import { MobileNav } from "./MobileNav";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/categories", label: "Categories" },
  { href: "/search", label: "Services" },
];

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="HomeServices Direct home">
      <span className="grid h-9 w-9 place-items-center rounded-md bg-gradient-to-br from-accent-400 to-brand-500 text-lg font-black text-white">
        H
      </span>
      <span className="leading-tight">
        <span className="block text-base font-extrabold text-ink-900">
          HomeServices<span className="text-brand-500">Direct</span>
        </span>
        <span className="block text-[10px] uppercase tracking-widest text-ink-500">Find. Compare. Hire.</span>
      </span>
    </Link>
  );
}

export async function SiteHeader() {
  const user = await getPrincipal();
  const accountHref =
    user?.role === "TRADER" ? "/dashboard" : user && ["ADMIN", "SUPER_ADMIN"].includes(user.role) ? "/admin" : "/account";

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-7 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="text-sm font-medium text-ink-700 hover:text-brand-600">
              {n.label}
            </Link>
          ))}
          {user ? (
            <Link href={accountHref} className="text-sm font-medium text-ink-700 hover:text-brand-600">My account</Link>
          ) : (
            <Link href="/login" className="text-sm font-medium text-ink-700 hover:text-brand-600">Login/Register</Link>
          )}
          <Link href="/register?type=trader" className="btn-accent py-2 text-xs">List Your Business</Link>
        </nav>
        <MobileNav items={[...NAV, user ? { href: accountHref, label: "My account" } : { href: "/login", label: "Login/Register" }]} />
      </div>
    </header>
  );
}
