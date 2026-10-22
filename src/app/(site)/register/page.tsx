import { SiteShell } from "@/components/layout/SiteShell";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { db } from "@/lib/db";

export const metadata = { title: "Create an account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const categories = await db.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (
    <SiteShell>
      <div className="mx-auto max-w-2xl py-12">
        <RegisterForm initialType={type === "trader" ? "trader" : "customer"} categories={categories} />
      </div>
    </SiteShell>
  );
}
