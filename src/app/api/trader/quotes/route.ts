import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/server/auth";
import { route } from "@/server/http";
import { myTraderProfile } from "@/server/services/traders";

// GET /api/trader/quotes — quote requests sent to the signed-in business.
export const GET = route(async () => {
  const user = await requireRole("TRADER");
  const profile = await myTraderProfile(user.id);
  const quotes = await db.quoteRequest.findMany({
    where: { traderId: profile.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true, name: true, email: true, phone: true, addressLine: true, city: true, postcode: true,
      description: true, contactTimes: true, contactNote: true, status: true, createdAt: true,
    },
  });
  return NextResponse.json({ quotes });
});
