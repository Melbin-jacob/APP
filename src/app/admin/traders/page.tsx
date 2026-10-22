import { AdminTradersClient } from "@/components/admin/TradersClient";

export const metadata = { title: "Traders · Ops console" };

export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  return <AdminTradersClient initialStatus={(await searchParams).status} />;
}
