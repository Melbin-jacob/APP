import { notFound } from "next/navigation";
import { AdminIncidentsClient } from "@/components/admin/IncidentsClient";
import { getPrincipal } from "@/server/auth";

export const metadata = { title: "Security incidents · Ops console" };

export default async function Page() {
  if ((await getPrincipal())?.role !== "SUPER_ADMIN") notFound();
  return <AdminIncidentsClient />;
}
