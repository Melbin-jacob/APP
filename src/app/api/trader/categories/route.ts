import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/server/audit";
import { requireRole } from "@/server/auth";
import { ApiError, parseJson, route } from "@/server/http";
import { invalidateTrader, myTraderProfile } from "@/server/services/traders";

const body = z.object({
  categoryIds: z.array(z.string().cuid()).min(1).max(8),
  primaryId: z.string().cuid(),
});

// PUT /api/trader/categories — the trades a business offers (one primary).
export const PUT = route(async (req) => {
  const user = await requireRole("TRADER");
  const trader = await myTraderProfile(user.id);
  const input = await parseJson(req, body);
  const ids = [...new Set(input.categoryIds)];
  if (!ids.includes(input.primaryId)) throw new ApiError(422, "invalid_primary", "Your primary trade must be one of your trades");
  const active = await db.category.count({ where: { id: { in: ids }, isActive: true } });
  if (active !== ids.length) throw new ApiError(422, "invalid_category", "Unknown trade");
  const inUse = await db.service.findFirst({ where: { traderId: trader.id, categoryId: { notIn: ids } }, select: { title: true } });
  if (inUse) throw new ApiError(409, "trade_in_use", `Move or remove "${inUse.title}" before removing its trade`);

  await db.$transaction([
    db.traderCategory.deleteMany({ where: { traderId: trader.id, categoryId: { notIn: ids } } }),
    ...ids.map((categoryId) =>
      db.traderCategory.upsert({
        where: { traderId_categoryId: { traderId: trader.id, categoryId } },
        create: { traderId: trader.id, categoryId, isPrimary: categoryId === input.primaryId },
        update: { isPrimary: categoryId === input.primaryId },
      }),
    ),
  ]);
  await audit({ actorId: user.id, action: "trader.update_trades", entityType: "TraderProfile", entityId: trader.id, metadata: { categoryIds: ids } });
  await invalidateTrader(trader.slug);
  return NextResponse.json({ ok: true });
});
