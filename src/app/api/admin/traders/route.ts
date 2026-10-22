import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/server/auth";
import { route } from "@/server/http";

// GET /api/admin/traders?status=PENDING — approval queue and directory.
// GET /api/admin/traders?credentials=PENDING — traders with documents to check.
export const GET = route(async (req) => {
  await requireRole("ADMIN");
  const status = z.enum(["PENDING", "APPROVED", "SUSPENDED", "REJECTED"]).optional().parse(req.nextUrl.searchParams.get("status") ?? undefined);
  const credentials = z.enum(["PENDING"]).optional().parse(req.nextUrl.searchParams.get("credentials") ?? undefined);
  const traders = await db.traderProfile.findMany({
    where: { status, ...(credentials ? { credentials: { some: { status: credentials } } } : {}) },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { email: true, status: true } },
      categories: { include: { category: { select: { name: true } } } },
      credentials: { select: { id: true, type: true, name: true, status: true, expiresAt: true } },
    },
  });
  return NextResponse.json({ traders });
});
