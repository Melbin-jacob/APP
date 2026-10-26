import Link from "next/link";
import { SignOutButton } from "@/components/account/AccountSettings";
import { getI18n } from "@/i18n/server";
import { getPrincipal } from "@/server/auth";
import { MobileNav } from "./MobileNav";

export async function Logo() {
  const { t } = await getI18n();
  return (
    <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label={t("brand.home")}>
      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG mark */}
      <img src="/brand/gettradepros-mark.svg" alt="" width={44} height={43} className="h-10 w-10 shrink-0 sm:h-11 sm:w-11" />
      <span className="min-w-0 leading-tight">
        <span className="block font-brand text-lg font-bold uppercase tracking-[0.08em] text-[#0B2545]" dir="ltr">
          GetTradePros
        </span>
        <span className="block truncate font-brand text-[8px] font-medium uppercase tracking-[0.04em] sm:tracking-[0.12em] text-[#0B2545]/80 sm:text-[9.5px]">{t("brand.tagline")}</span>
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
          {user && <SignOutButton className="text-sm font-medium text-ink-500 hover:text-rose-700" />}
          {user?.role !== "TRADER" && <Link href="/register?type=trader" className="btn-accent py-2 text-xs">{t("nav.listBusiness")}</Link>}
        </nav>
        <MobileNav items={nav} cta={user?.role === "TRADER" ? undefined : t("nav.listBusiness")} menuLabel={t("nav.menu")} signOut={!!user} />
      </div>
    </header>
  );
}
