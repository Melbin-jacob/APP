import { NextResponse, type NextRequest } from "next/server";
import { recordBannerClick } from "@/server/services/banners";

// GET /api/banners/:id/click — counts the click, then 302s to the advertiser.
// The destination comes from the DB (admin-set), never from the query string,
// so this can't be abused as an open redirect.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const target = await recordBannerClick((await params).id);
  return NextResponse.redirect(target ?? new URL("/", req.nextUrl.origin), 302);
}
