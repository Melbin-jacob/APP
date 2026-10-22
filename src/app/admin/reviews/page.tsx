import { AdminReviewsClient } from "@/components/admin/ReviewsClient";

export const metadata = { title: "Reviews · Ops console" };

export default async function Page({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  return <AdminReviewsClient initialFilter={(await searchParams).filter} />;
}
