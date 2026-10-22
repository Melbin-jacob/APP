import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { safeEqual } from "@/lib/crypto";
import { newsletterSignature } from "@/server/services/newsletter";

// GET /api/newsletter/confirm?email=&sig=
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.toLowerCase() ?? "";
  const sig = req.nextUrl.searchParams.get("sig") ?? "";
  const ok = email && safeEqual(sig, newsletterSignature(email));
  if (ok) await db.newsletterSubscriber.updateMany({ where: { email }, data: { confirmedAt: new Date() } });
  return NextResponse.redirect(new URL(ok ? "/?subscribed=1" : "/?subscribed=0", req.nextUrl.origin));
}
