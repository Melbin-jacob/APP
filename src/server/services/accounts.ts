import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/crypto";
import { TOS_VERSION } from "@/lib/legal";
import { plainText, slugify } from "@/lib/sanitize";
import { audit } from "../audit";
import { ApiError } from "../http";
import { getSetting } from "../settings";
import { lookupPostcode } from "./geo";

const password = z
  .string()
  .min(12, "Use at least 12 characters")
  .max(200)
  .refine((p) => /[a-z]/i.test(p) && /\d/.test(p), "Include letters and numbers");

// `acceptTerms: z.literal(true)` — registration is impossible without the
// explicit liability-disclaimer acceptance.
const base = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password,
  name: z.string().trim().min(1).max(80),
  acceptTerms: z.literal(true, { message: "You must accept the Terms of Service" }),
  marketingOptIn: z.boolean().default(false),
});

export const customerRegistrationInput = base;

const ukOrUsPostcode = /^([A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}|\d{5}(-\d{4})?)$/i;

// The business location comes only from the postcode, resolved on the
// server: city and coordinates sent by the browser are never trusted.

export const traderRegistrationInput = base.extend({
  businessName: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number"),
  categoryId: z.string().cuid(),
  hourlyRatePence: z.number().int().min(0).max(100_000).optional(),
  postcode: z.string({ error: "Enter your business postcode / ZIP" }).trim().regex(ukOrUsPostcode, "Enter a full UK postcode or a 5-digit US ZIP code"),
  serviceRadiusKm: z.number().int().min(1).max(300).default(25),
  servicePostcodes: z.array(z.string().trim().toUpperCase().max(10)).max(100).default([]),
});

async function assertEmailFree(email: string) {
  // Same generic message whether or not the account exists would be nicer for
  // enumeration, but registration UX needs it; the endpoint is rate-limited.
  if (await db.user.findUnique({ where: { email }, select: { id: true } })) {
    throw new ApiError(409, "email_taken", "An account with this email already exists");
  }
}

export async function registerCustomer(input: z.infer<typeof customerRegistrationInput>, ipHash: string) {
  await assertEmailFree(input.email);
  const user = await db.user.create({
    data: {
      email: input.email,
      name: plainText(input.name, 80),
      passwordHash: await hashPassword(input.password),
      role: "CUSTOMER",
      tosVersion: TOS_VERSION,
      tosAcceptedAt: new Date(),
      marketingOptIn: input.marketingOptIn,
    },
  });
  await audit({ actorId: user.id, action: "user.register", entityType: "User", entityId: user.id, ipHash, metadata: { tosVersion: TOS_VERSION } });
  return { id: user.id };
}

async function uniqueSlug(name: string) {
  const root = slugify(name) || "trader";
  for (let i = 0; i < 20; i++) {
    const slug = i === 0 ? root : `${root}-${i + 1}`;
    if (!(await db.traderProfile.findUnique({ where: { slug }, select: { id: true } }))) return slug;
  }
  return `${root}-${Date.now().toString(36)}`;
}

export async function registerTrader(input: z.infer<typeof traderRegistrationInput>, ipHash: string) {
  await assertEmailFree(input.email);
  const category = await db.category.findFirst({ where: { id: input.categoryId, isActive: true } });
  if (!category) throw new ApiError(422, "invalid_category", "Unknown trade category");

  const location = await lookupPostcode(input.postcode);
  if (!location) throw new ApiError(422, "postcode_not_found", "We couldn't find that postcode. Check it and try again.");

  const requireApproval = await getSetting("traders.requireApproval");
  const passwordHash = await hashPassword(input.password);
  const businessName = plainText(input.businessName, 100);
  const slug = await uniqueSlug(businessName);

  const user = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        name: plainText(input.name, 80),
        passwordHash,
        role: "TRADER",
        tosVersion: TOS_VERSION,
        tosAcceptedAt: new Date(),
        marketingOptIn: input.marketingOptIn,
        trader: {
          create: {
            businessName,
            slug,
            phone: input.phone,
            hourlyRatePence: input.hourlyRatePence,
            city: location.city,
            postcode: location.postcode,
            country: location.country,
            currency: location.country === "US" ? "USD" : "GBP",
            latitude: location.latitude,
            longitude: location.longitude,
            serviceRadiusKm: input.serviceRadiusKm,
            status: requireApproval ? "PENDING" : "APPROVED",
            categories: { create: { categoryId: category.id, isPrimary: true } },
            serviceAreas: {
              create: [...new Set(input.servicePostcodes.filter(Boolean))].map((postcode) => ({ postcode })),
            },
          },
        },
      },
    });
    await audit(
      { actorId: user.id, action: "trader.register", entityType: "User", entityId: user.id, ipHash, metadata: { tosVersion: TOS_VERSION } },
      tx,
    );
    return user;
  });

  return { id: user.id, slug, status: requireApproval ? "PENDING" : "APPROVED" };
}

// ─── GDPR / CCPA ─────────────────────────────────────────────────────────────

/** Right of access / portability: everything we hold about the user, as JSON. */
export async function exportUserData(userId: string) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true, email: true, name: true, role: true, status: true, createdAt: true,
      tosVersion: true, tosAcceptedAt: true, marketingOptIn: true, lastLoginAt: true,
      accounts: { select: { provider: true, providerAccountId: true } },
      reviews: { select: { id: true, traderId: true, rating: true, comment: true, createdAt: true, status: true } },
      reviewReports: { select: { reviewId: true, reason: true, details: true, createdAt: true } },
      trader: {
        include: {
          categories: true, services: true, serviceAreas: true, gallery: true, credentials: true,
          jobs: true, reviews: { select: { id: true, rating: true, comment: true, authorName: true, createdAt: true } },
        },
      },
    },
  });
  const reviewRequests = await db.reviewRequest.findMany({
    where: { customerEmail: user.email },
    select: { traderId: true, status: true, createdAt: true, usedAt: true },
  });
  const newsletter = await db.newsletterSubscriber.findUnique({ where: { email: user.email } });
  return { exportedAt: new Date().toISOString(), user, reviewRequestsReceived: reviewRequests, newsletter };
}

/**
 * Right to erasure. PII is scrubbed immediately and the account disabled;
 * reviews stay (they belong to the trader's public record) but are
 * de-identified. Audit rows keep only the opaque user id.
 */
export async function deleteAccount(userId: string, ipHash: string) {
  const tombstone = `deleted+${userId}@invalid.local`;
  await db.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    await tx.reviewRequest.updateMany({ where: { customerEmail: user.email }, data: { customerEmail: tombstone, customerName: null } });
    await tx.newsletterSubscriber.deleteMany({ where: { email: user.email } });
    await tx.review.updateMany({ where: { authorId: userId }, data: { authorName: "Former customer", authorId: null } });
    await tx.account.deleteMany({ where: { userId } });
    await tx.traderProfile.deleteMany({ where: { userId } });
    await tx.user.update({
      where: { id: userId },
      data: {
        email: tombstone, name: null, image: null, passwordHash: null, marketingOptIn: false,
        status: "PENDING_DELETION", deletedAt: new Date(),
      },
    });
    await audit({ actorId: userId, action: "user.delete", entityType: "User", entityId: userId, ipHash }, tx);
  });
}
