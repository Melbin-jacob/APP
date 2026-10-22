import { AdminUsersClient } from "@/components/admin/UsersClient";

export const metadata = { title: "Users · Ops console" };

export default async function Page({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  return <AdminUsersClient initialRole={(await searchParams).role} />;
}
