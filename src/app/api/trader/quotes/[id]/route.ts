import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/server/auth";
import { notFound, parseJson, route } from "@/server/http";
import { myTraderProfile } from "@/server/services/traders";

const body = z.object({ status: z.enum(["NEW", "CONTACTED", "CLOSED"]) });

// PATCH /api/trader/quotes/:id — the business tracks its follow-up.
export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireRole("TRADER");
  const profile = await myTraderProfile(user.id);
  const { status } = await parseJson(req, body);
  // Scoped to this business: another business's request id is simply not found.
  const updated = await db.quoteRequest.updateMany({ where: { id: (await params).id, traderId: profile.id }, data: { status } });
  if (!updated.count) throw notFound("Quote request");
  return NextResponse.json({ ok: true });
});
