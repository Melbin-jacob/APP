import { SiteShell } from "@/components/layout/SiteShell";
import { LoginForm } from "@/components/auth/LoginForm";

import { getI18n } from "@/i18n/server";

export async function generateMetadata() {
  return { title: (await getI18n()).t("login.title") };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string; callbackUrl?: string; notice?: string }> }) {
  const sp = await searchParams;
  // Only allow same-site relative callbacks (no open redirect; browsers read "/\\" as "//").
  // Without one, /start sends each account to its own page (dashboard, console or account).
  const cb = sp.callbackUrl;
  const callbackUrl = cb?.startsWith("/") && !cb.startsWith("//") && !cb.startsWith("/\\") ? cb : "/start";
  return (
    <SiteShell>
      <div className="mx-auto max-w-md py-12">
        <LoginForm sent={sp.sent === "1"} error={sp.error} callbackUrl={callbackUrl} notice={sp.notice} />
      </div>
    </SiteShell>
  );
}
