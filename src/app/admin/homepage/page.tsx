import { notFound } from "next/navigation";
import { HomepageImageClient } from "@/components/admin/HomepageImageClient";
import { PageTitle } from "@/components/admin/ui";
import { DEFAULT_HERO_IMAGE } from "@/components/home/Hero";
import { getPrincipal } from "@/server/auth";
import { getSetting } from "@/server/settings";

export const metadata = { title: "Homepage · Ops console" };

export default async function Page() {
  const user = await getPrincipal();
  if (user?.role !== "SUPER_ADMIN") notFound();
  return (
    <>
      <PageTitle>Homepage picture</PageTitle>
      <HomepageImageClient current={await getSetting("home.heroImageUrl")} fallback={DEFAULT_HERO_IMAGE} />
    </>
  );
}
