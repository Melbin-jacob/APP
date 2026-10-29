import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/server/auth";
import { route } from "@/server/http";

// GET /api/admin/claims?status=PENDING — listing claims to verify.
export const GET = route(async (req) => {
  await requireRole("ADMIN");
  const status = z.enum(["PENDING", "APPROVED", "REJECTED"]).catch("PENDING").parse(req.nextUrl.searchParams.get("status"));
  const claims = await db.listingClaim.findMany({
    where: { status },
    orderBy: { createdAt: status === "PENDING" ? "asc" : "desc" },
    take: 100,
    include: {
      trader: { select: { businessName: true, slug: true, city: true, phone: true, website: true, userId: true } },
      user: { select: { email: true, name: true, createdAt: true } },
      documents: { select: { id: true, kind: true, fileName: true, contentType: true, size: true }, orderBy: { kind: "asc" } },
    },
  });
  return NextResponse.json({ claims });
});
