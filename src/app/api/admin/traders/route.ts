import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/server/auth";
import { route } from "@/server/http";

// GET /api/admin/traders?status=PENDING — approval queue and directory.
// GET /api/admin/traders?credentials=PENDING — traders with documents to check.
// &q=… narrows by business name, slug, city or owner email (e.g. to handle a claim request).
export const GET = route(async (req) => {
  await requireRole("ADMIN");
  const status = z.enum(["PENDING", "APPROVED", "SUSPENDED", "REJECTED"]).optional().parse(req.nextUrl.searchParams.get("status") ?? undefined);
  const credentials = z.enum(["PENDING"]).optional().parse(req.nextUrl.searchParams.get("credentials") ?? undefined);
  const q = z.string().trim().max(80).optional().parse(req.nextUrl.searchParams.get("q") || undefined);
  const contains = { contains: q, mode: "insensitive" as const };
  const where = {
    status,
    ...(credentials ? { credentials: { some: { status: credentials } } } : {}),
    ...(q ? { OR: [{ businessName: contains }, { slug: contains }, { city: contains }, { user: { email: contains } }] } : {}),
  };
  const [traders, total] = await Promise.all([db.traderProfile.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { email: true, status: true } },
      categories: { include: { category: { select: { name: true } } } },
      credentials: { select: { id: true, type: true, name: true, status: true, expiresAt: true } },
    },
  }), db.traderProfile.count({ where })]);
  return NextResponse.json({ traders, total });
});
