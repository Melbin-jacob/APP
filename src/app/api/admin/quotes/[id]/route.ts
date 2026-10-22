import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/server/auth";
import { audit } from "@/server/audit";
import { notFound, parseJson, route } from "@/server/http";

const body = z.object({ status: z.enum(["NEW", "CONTACTED", "CLOSED"]) });

// PATCH /api/admin/quotes/:id — e.g. mark a request as passed on to the business.
export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const admin = await requireRole("ADMIN");
  const { status } = await parseJson(req, body);
  const id = (await params).id;
  const updated = await db.quoteRequest.updateMany({ where: { id }, data: { status } });
  if (!updated.count) throw notFound("Quote request");
  await audit({ actorId: admin.id, action: "quote.status", entityType: "QuoteRequest", entityId: id, metadata: { status } });
  return NextResponse.json({ ok: true });
});
