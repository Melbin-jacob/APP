import { z } from "zod";
import { COMPANY } from "@/lib/company";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { type CountryCode, COUNTRIES, isSupportedCountry, parsePostcode } from "@/lib/postcode";
import { CONTACT_TIMES, PHONE_PATTERN, QUOTE_LIMITS as L } from "@/lib/quotes";
import { plainText } from "@/lib/sanitize";
import { ApiError, notFound } from "@/server/http";
import { quoteReceiptEmail, quoteRequestEmail } from "@/server/email/templates";
import { sendEmail } from "@/server/email/transport";

export const quoteInput = z.object({
  name: z.string().trim().min(2).max(L.name),
  email: z.string().trim().email().max(254).optional().or(z.literal("").transform(() => undefined)),
  phone: z.string().trim().regex(PHONE_PATTERN, "Enter a valid phone number"),
  addressLine: z.string().trim().min(3).max(L.address),
  city: z.string().trim().min(2).max(L.city),
  postcode: z.string().trim().min(3).max(10),
  description: z.string().trim().min(L.descriptionMin).max(L.description),
  contactTimes: z.array(z.enum(CONTACT_TIMES)).min(1).max(CONTACT_TIMES.length),
  contactNote: z.string().trim().max(L.note).optional(),
  consent: z.literal(true),
  // Honeypot: hidden from people, filled in by naive bots.
  website: z.string().max(200).optional(),
});
export type QuoteInput = z.infer<typeof quoteInput>;

/**
 * Stores a quote request and emails it to the business (claimed listing) or to
 * ops (unclaimed), plus a receipt to the customer if they gave an email.
 * Returns whether the business itself was notified.
 */
export async function createQuoteRequest(slug: string, input: QuoteInput, ctx: { customerId?: string; ipHash: string }) {
  const trader = await db.traderProfile.findFirst({
    where: { slug, status: "APPROVED" },
    select: { id: true, businessName: true, slug: true, country: true, phone: true, user: { select: { email: true, status: true } } },
  });
  if (!trader) throw notFound("Business");

  const country = (isSupportedCountry(trader.country) ? trader.country : "US") as CountryCode;
  const postcode = parsePostcode(country, input.postcode);
  if (!postcode) {
    throw new ApiError(422, "invalid_postcode", `Enter a valid ${COUNTRIES[country].postalLabel} for an address in the same country as the business`);
  }

  const { APP_URL } = env(); // read config before saving, so a bad config can't leave a half-handled request
  const owner = trader.user?.status === "ACTIVE" ? trader.user.email : null;
  const data = {
    name: plainText(input.name, L.name),
    email: input.email ?? null,
    phone: input.phone,
    addressLine: plainText(input.addressLine, L.address),
    city: plainText(input.city, L.city),
    postcode: postcode.code,
    description: plainText(input.description, L.description),
    contactTimes: [...new Set(input.contactTimes)],
    contactNote: input.contactNote ? plainText(input.contactNote, L.note) || null : null,
  };
  const quote = await db.quoteRequest.create({
    data: { ...data, traderId: trader.id, customerId: ctx.customerId, ipHash: ctx.ipHash },
    select: { id: true },
  });

  const details = { ...data, businessName: trader.businessName, address: `${data.addressLine}, ${data.city}, ${data.postcode}` };
  const sends = [
    sendEmail({
      to: owner ?? COMPANY.supportEmail,
      ...quoteRequestEmail({
        ...details,
        forOps: !owner,
        listingPhone: trader.phone || undefined,
        dashboardUrl: `${APP_URL}/dashboard`,
        adminUrl: `${APP_URL}/admin/quotes`,
      }),
      tag: "quote_request",
    }),
  ];
  if (data.email) {
    sends.push(sendEmail({
      to: data.email,
      ...quoteReceiptEmail({ ...details, claimed: !!owner, profileUrl: `${APP_URL}/traders/${trader.slug}` }),
      tag: "quote_receipt",
    }));
  }
  // The request is saved and visible in the dashboard / ops console either way.
  const results = await Promise.allSettled(sends);
  for (const r of results) if (r.status === "rejected") console.error("[quotes] email failed", r.reason);

  return { id: quote.id, sentToBusiness: !!owner };
}
