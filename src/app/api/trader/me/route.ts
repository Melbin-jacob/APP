import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { plainText, safeUrl } from "@/lib/sanitize";
import { requireRole } from "@/server/auth";
import { audit } from "@/server/audit";
import { badRequest, notFound, parseJson, route } from "@/server/http";
import { invalidateTrader } from "@/server/services/traders";

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const day = z.array(z.object({ open: hhmm, close: hhmm })).max(3);
const url = z.string().max(500).transform((v, ctx) => {
  const safe = safeUrl(v);
  if (!safe) ctx.addIssue({ code: "custom", message: "Must be an http(s) URL" });
  return safe ?? "";
});

const patch = z
  .object({
    businessName: z.string().trim().min(2).max(100),
    bio: z.string().max(4000),
    phone: z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/),
    hourlyRatePence: z.number().int().min(0).max(100_000).nullable(),
    logoUrl: url.nullable(),
    coverImageUrl: url.nullable(),
    serviceRadiusKm: z.number().int().min(1).max(300),
    operatingHours: z.object({ mon: day, tue: day, wed: day, thu: day, fri: day, sat: day, sun: day }).partial(),
    gallery: z.array(z.object({ url, caption: z.string().max(140).optional() })).max(30),
  })
  .partial();

async function myProfile(userId: string) {
  const profile = await db.traderProfile.findUnique({ where: { userId } });
  if (!profile) throw notFound("Trader profile");
  return profile;
}

// GET /api/trader/me — the signed-in trader's full (private) profile.
export const GET = route(async () => {
  const user = await requireRole("TRADER");
  const profile = await db.traderProfile.findUnique({
    where: { userId: user.id },
    include: { categories: { include: { category: true } }, gallery: true, credentials: true, serviceAreas: true },
  });
  if (!profile) throw notFound("Trader profile");
  return NextResponse.json({ profile });
});

// PATCH /api/trader/me — profile customisation.
export const PATCH = route(async (req) => {
  const user = await requireRole("TRADER");
  const input = await parseJson(req, patch);
  if (!Object.keys(input).length) throw badRequest("Nothing to update");
  const profile = await myProfile(user.id);
  const { gallery, ...fields } = input;

  await db.$transaction(async (tx) => {
    await tx.traderProfile.update({
      where: { id: profile.id },
      data: {
        ...fields,
        businessName: fields.businessName ? plainText(fields.businessName, 100) : undefined,
        bio: fields.bio !== undefined ? plainText(fields.bio, 4000) : undefined,
      },
    });
    if (gallery) {
      await tx.galleryImage.deleteMany({ where: { traderId: profile.id } });
      await tx.galleryImage.createMany({
        data: gallery.map((g, i) => ({
          traderId: profile.id, url: g.url, caption: g.caption ? plainText(g.caption, 140) : null, sortOrder: i,
        })),
      });
    }
    await audit({ actorId: user.id, action: "trader.update_profile", entityType: "TraderProfile", entityId: profile.id, metadata: { fields: Object.keys(input) } }, tx);
  });
  await invalidateTrader(profile.slug);
  return NextResponse.json({ ok: true });
});
