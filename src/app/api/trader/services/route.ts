import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { plainText } from "@/lib/sanitize";
import { audit } from "@/server/audit";
import { requireRole } from "@/server/auth";
import { ApiError, parseJson, route } from "@/server/http";
import { MAX_SERVICES, assertOwnTrade, invalidateTrader, myTraderProfile, serviceInput } from "@/server/services/traders";

// GET /api/trader/services
export const GET = route(async () => {
  const user = await requireRole("TRADER");
  const trader = await myTraderProfile(user.id);
  const services = await db.service.findMany({ where: { traderId: trader.id }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ services });
});

// POST /api/trader/services — add a service to the business profile.
export const POST = route(async (req) => {
  const user = await requireRole("TRADER");
  const trader = await myTraderProfile(user.id);
  const input = await parseJson(req, serviceInput);
  await assertOwnTrade(trader.id, input.categoryId);
  if ((await db.service.count({ where: { traderId: trader.id } })) >= MAX_SERVICES) {
    throw new ApiError(422, "too_many_services", `You can list up to ${MAX_SERVICES} services`);
  }
  const service = await db.service.create({
    data: {
      traderId: trader.id,
      categoryId: input.categoryId,
      title: plainText(input.title, 120),
      description: input.description ? plainText(input.description, 1000) : null,
      priceFromPence: input.priceFromPence ?? null,
      priceUnit: input.priceUnit ?? null,
    },
  });
  await audit({ actorId: user.id, action: "service.create", entityType: "Service", entityId: service.id });
  await invalidateTrader(trader.slug);
  return NextResponse.json({ service }, { status: 201 });
});
