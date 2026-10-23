import Link from "next/link";
import { SiteShell } from "@/components/layout/SiteShell";
import { getI18n } from "@/i18n/server";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <SiteShell>
      <div className="grid place-items-center py-24 text-center">
        <div>
          <p className="text-6xl font-black text-brand-500">404</p>
          <h1 className="mt-2 text-xl font-bold">{t("notFound.title")}</h1>
          <Link href="/" className="btn-primary mt-6">{t("notFound.back")}</Link>
        </div>
      </div>
    </SiteShell>
  );
}
