import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { detectPostcode } from "@/lib/postcode";
import { PHONE_PATTERN } from "@/lib/quotes";
import { plainText } from "@/lib/sanitize";
import { audit } from "@/server/audit";
import { requireUser, invalidatePrincipal } from "@/server/auth";
import { enforceRateLimit, ipHash, parseJson, route } from "@/server/http";
import { deleteAccount } from "@/server/services/accounts";

// Optional contact fields: an empty string clears them.
const optional = (max: number) => z.string().trim().max(max).transform((v) => v || null);

const profile = z
  .object({
    name: z.string().trim().min(1).max(80),
    marketingOptIn: z.boolean(),
    phone: z.string().trim().max(20).refine((v) => v === "" || PHONE_PATTERN.test(v), "Enter a valid phone number").transform((v) => v || null),
    addressLine: optional(200),
    city: optional(80),
    postcode: z.string().trim().max(10).transform((v, ctx) => {
      if (!v) return null;
      const hit = detectPostcode(v);
      if (!hit) ctx.addIssue({ code: "custom", message: "Enter a valid ZIP or postal code" });
      return hit?.code ?? null;
    }),
  })
  .partial();

// PATCH /api/me — edit your own profile (name, contact details, marketing emails).
export const PATCH = route(async (req) => {
  const user = await requireUser();
  const input = await parseJson(req, profile);
  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      name: input.name !== undefined ? plainText(input.name, 80) : undefined,
      marketingOptIn: input.marketingOptIn,
      phone: input.phone,
      addressLine: input.addressLine === undefined ? undefined : input.addressLine && plainText(input.addressLine, 200),
      city: input.city === undefined ? undefined : input.city && plainText(input.city, 80),
      postcode: input.postcode,
    },
    select: { name: true, marketingOptIn: true, phone: true, addressLine: true, city: true, postcode: true },
  });
  await audit({ actorId: user.id, action: "user.update_profile", entityType: "User", entityId: user.id, ipHash: ipHash(req), metadata: { fields: Object.keys(input) } });
  return NextResponse.json({ user: updated });
});

// DELETE /api/me — GDPR/CCPA erasure. Requires typing the confirmation phrase.
export const DELETE = route(async (req) => {
  const user = await requireUser();
  await enforceRateLimit("login", `delete:${user.id}`);
  await parseJson(req, z.object({ confirm: z.literal("DELETE MY ACCOUNT") }));
  await deleteAccount(user.id, ipHash(req));
  await invalidatePrincipal(user.id);
  return NextResponse.json({ ok: true });
});
