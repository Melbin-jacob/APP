import { redirect } from "next/navigation";
import { SiteShell } from "@/components/layout/SiteShell";
import { PrivacyControls } from "@/components/auth/PrivacyControls";
import { getPrincipal } from "@/server/auth";

export const metadata = { title: "Your account" };

export default async function AccountPage() {
  const user = await getPrincipal();
  if (!user) redirect("/login?callbackUrl=/account");
  return (
    <SiteShell>
      <div className="mx-auto max-w-2xl space-y-6 py-10">
        <section className="card p-6">
          <h1 className="text-xl font-bold">Your account</h1>
          <p className="mt-1 text-sm text-ink-500">Signed in as {user.email}</p>
        </section>
        <PrivacyControls />
      </div>
    </SiteShell>
  );
}
