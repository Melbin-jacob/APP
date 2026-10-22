import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { plainText } from "@/lib/sanitize";
import { requireRole } from "@/server/auth";
import { notFound, parseJson, route } from "@/server/http";

const createJob = z.object({
  title: z.string().trim().min(2).max(140),
  customerEmail: z.string().trim().toLowerCase().email().max(254),
  customerName: z.string().trim().max(80).optional(),
});

async function traderId(userId: string) {
  const t = await db.traderProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!t) throw notFound("Trader profile");
  return t.id;
}

// GET /api/trader/jobs
export const GET = route(async () => {
  const user = await requireRole("TRADER");
  const jobs = await db.job.findMany({
    where: { traderId: await traderId(user.id) },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { reviewRequest: { select: { status: true, sentAt: true, usedAt: true } } },
  });
  return NextResponse.json({ jobs });
});

// POST /api/trader/jobs
export const POST = route(async (req) => {
  const user = await requireRole("TRADER");
  const input = await parseJson(req, createJob);
  const job = await db.job.create({
    data: {
      traderId: await traderId(user.id),
      title: plainText(input.title, 140),
      customerEmail: input.customerEmail,
      customerName: input.customerName ? plainText(input.customerName, 80) : null,
    },
  });
  return NextResponse.json({ job }, { status: 201 });
});
