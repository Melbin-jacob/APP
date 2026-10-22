import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { plainText } from "@/lib/sanitize";
import { audit } from "@/server/audit";
import { requireRole } from "@/server/auth";
import { notFound, parseJson, route } from "@/server/http";
import { assertOwnTrade, invalidateTrader, myTraderProfile, serviceInput } from "@/server/services/traders";

type Ctx = { params: Promise<{ id: string }> };

// Ownership is enforced by scoping every lookup to the caller's own business.
async function ownService(userId: string, id: string) {
  const trader = await myTraderProfile(userId);
  const service = await db.service.findFirst({ where: { id, traderId: trader.id } });
  if (!service) throw notFound("Service");
  return { trader, service };
}

// PATCH /api/trader/services/:id
export const PATCH = route<Ctx>(async (req, { params }) => {
  const user = await requireRole("TRADER");
  const { trader, service } = await ownService(user.id, (await params).id);
  const input = await parseJson(req, serviceInput.partial());
  if (input.categoryId) await assertOwnTrade(trader.id, input.categoryId);
  const updated = await db.service.update({
    where: { id: service.id },
    data: {
      title: input.title !== undefined ? plainText(input.title, 120) : undefined,
      categoryId: input.categoryId,
      description: input.description !== undefined ? (input.description ? plainText(input.description, 1000) : null) : undefined,
      priceFromPence: input.priceFromPence,
      priceUnit: input.priceUnit,
    },
  });
  await audit({ actorId: user.id, action: "service.update", entityType: "Service", entityId: service.id });
  await invalidateTrader(trader.slug);
  return NextResponse.json({ service: updated });
});

// DELETE /api/trader/services/:id
export const DELETE = route<Ctx>(async (_req, { params }) => {
  const user = await requireRole("TRADER");
  const { trader, service } = await ownService(user.id, (await params).id);
  await db.service.delete({ where: { id: service.id } });
  await audit({ actorId: user.id, action: "service.delete", entityType: "Service", entityId: service.id });
  await invalidateTrader(trader.slug);
  return NextResponse.json({ ok: true });
});
