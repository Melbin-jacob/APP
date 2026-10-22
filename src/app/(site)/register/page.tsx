import type { Metadata } from "next";
import { SiteShell } from "@/components/layout/SiteShell";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { db } from "@/lib/db";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t("register.title") };
}

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ type?: string; next?: string }> }) {
  const { type, next } = await searchParams;
  // Same-site paths only (e.g. back to a listing being claimed); never an open redirect.
  const safeNext = next?.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : undefined;
  const categories = await db.category.findMany({ where: { isActive: true }, select: { id: true, slug: true, name: true } });
  return (
    <SiteShell>
      <div className="mx-auto max-w-2xl py-12">
        <RegisterForm initialType={type === "trader" ? "trader" : "customer"} categories={categories} next={safeNext} />
      </div>
    </SiteShell>
  );
}
