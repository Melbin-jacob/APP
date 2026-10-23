import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SecuritySettings } from "@/components/account/SecuritySettings";
import { SiteShell } from "@/components/layout/SiteShell";
import { db } from "@/lib/db";
import { getI18n } from "@/i18n/server";
import { adminMfaRequired, getPrincipal } from "@/server/auth";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t("security.title") };
}

export default async function SecurityPage() {
  const [user, { t }] = await Promise.all([getPrincipal(), getI18n()]);
  if (!user) redirect("/login?callbackUrl=/account/security");
  const isStaff = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
  const row = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
  const back = isStaff ? "/admin" : user.role === "TRADER" ? "/dashboard" : "/account";
  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl space-y-6 py-10">
        <header>
          <Link href={back} className="text-sm text-brand-700 hover:underline">← {t("security.back")}</Link>
          <h1 className="mt-2 text-xl font-bold">{t("security.title")}</h1>
          <p className="text-sm text-ink-500">{t("security.intro")}</p>
        </header>
        <SecuritySettings required={isStaff && adminMfaRequired()} isStaff={isStaff} hasPassword={!!row.passwordHash} />
      </div>
    </SiteShell>
  );
}
