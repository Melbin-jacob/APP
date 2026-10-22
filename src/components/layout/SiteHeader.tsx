import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { getPrincipal } from "@/server/auth";
import { MobileNav } from "./MobileNav";

export async function Logo() {
  const { t } = await getI18n();
  return (
    <Link href="/" className="flex items-center gap-2" aria-label={t("brand.home")}>
      <span className="grid h-9 w-9 place-items-center rounded-md bg-gradient-to-br from-accent-400 to-brand-500 text-lg font-black text-white">
        H
      </span>
      <span className="leading-tight">
        <span className="block text-base font-extrabold text-ink-900" dir="ltr">
          HomeServices<span className="text-brand-500">Direct</span>
        </span>
        <span className="block text-[10px] uppercase tracking-widest text-ink-500">{t("brand.tagline")}</span>
      </span>
    </Link>
  );
}

export async function SiteHeader() {
  const [{ t }, user] = await Promise.all([getI18n(), getPrincipal()]);
  const accountHref =
    user?.role === "TRADER" ? "/dashboard" : user && ["ADMIN", "SUPER_ADMIN"].includes(user.role) ? "/admin" : "/account";
  const nav = [
    { href: "/", label: t("nav.home") },
    { href: "/categories", label: t("nav.categories") },
    { href: "/search", label: t("nav.services") },
    user ? { href: accountHref, label: t("nav.myAccount") } : { href: "/login", label: t("nav.loginRegister") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-7 md:flex">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="text-sm font-medium text-ink-700 hover:text-brand-600">
              {n.label}
            </Link>
          ))}
          <Link href="/register?type=trader" className="btn-accent py-2 text-xs">{t("nav.listBusiness")}</Link>
        </nav>
        <MobileNav items={nav} cta={t("nav.listBusiness")} menuLabel={t("nav.menu")} />
      </div>
    </header>
  );
}
