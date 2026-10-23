/* Seed: trade categories, the business directory (prisma/data), the site
 * settings, and two local-testing logins (admin + customer). Safe to re-run.
 * There are no fake business listings: every listing comes from the directory
 * import or from a real sign-up. */
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { CATEGORIES } from "./categories";
import { importDirectory } from "./import-directory";
import { TOS_VERSION } from "../src/lib/legal";

const db = new PrismaClient();
const TOS = TOS_VERSION;

// Local-testing logins. Re-applied on every seed (so every Docker start), so
// they always work even after a password change, suspension or new Terms.
const TEST_PASSWORD = "ChangeMe-123456";
const TEST_LOGINS = [
  { email: "admin@homeservices.local", name: "Ops Admin", role: "SUPER_ADMIN" as const },
  { email: "customer@homeservices.local", name: "Casey Customer", role: "CUSTOMER" as const },
  { email: "business@homeservices.local", name: "Blake Business", role: "TRADER" as const },
];

// The test business login's own profile. Kept PENDING so it never shows in
// public listings (don't approve it); edits made while testing survive restarts.
const DEMO_BUSINESS = {
  slug: "demo-business-test-account",
  businessName: "Demo Business (test account)",
  phone: "+1 519-555-0142",
  bio: "Test account for trying the business dashboard. Not a real business.",
  hourlyRatePence: 7500,
  currency: "CAD",
  addressLine: "350 City Hall Square W",
  city: "Windsor",
  postcode: "N9A 6S1",
  country: "CA",
  latitude: 42.3149,
  longitude: -83.0364,
  serviceRadiusKm: 25,
  status: "PENDING" as const,
  operatingHours: {
    mon: [{ open: "08:00", close: "17:00" }], tue: [{ open: "08:00", close: "17:00" }], wed: [{ open: "08:00", close: "17:00" }],
    thu: [{ open: "08:00", close: "17:00" }], fri: [{ open: "08:00", close: "16:00" }],
  },
};

async function main() {
  for (const [i, [slug, name, icon]] of CATEGORIES.entries()) {
    await db.category.upsert({ where: { slug }, create: { slug, name, icon, sortOrder: i }, update: { name, icon, sortOrder: i } });
  }

  // Earlier versions seeded fictional businesses (New York / Toronto, and a
  // pending roofer). Remove them and everything attached (reviews, jobs…).
  const legacy = await db.user.deleteMany({
    where: { OR: [{ email: { startsWith: "trader", endsWith: "@homeservices.local" } }, { email: "pending@homeservices.local" }] },
  });
  if (legacy.count) console.log(`Removed ${legacy.count} demo business accounts.`);
  // …and the placeholder side-banner ads that pointed at example.com.
  await db.banner.deleteMany({ where: { targetUrl: { startsWith: "https://example.com/" } } });

  const result = await importDirectory(db);
  console.log("Directory import:", result);

  // Local-testing logins only. Never run this seed against production.
  const passwordHash = await hash(TEST_PASSWORD, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
  for (const login of TEST_LOGINS) {
    const usable = { passwordHash, status: "ACTIVE" as const, deletedAt: null, tosVersion: TOS, tosAcceptedAt: new Date() };
    await db.user.upsert({
      where: { email: login.email },
      create: { ...login, ...usable, emailVerified: new Date() },
      // The customer keeps a business role if it claimed a listing while testing.
      update: login.role === "CUSTOMER" ? usable : { ...usable, role: login.role },
    });
  }

  const owner = await db.user.findUniqueOrThrow({ where: { email: "business@homeservices.local" }, select: { id: true, trader: { select: { id: true } } } });
  if (!owner.trader) {
    const handyman = await db.category.findUniqueOrThrow({ where: { slug: "handyman" }, select: { id: true } });
    await db.traderProfile.create({
      data: {
        ...DEMO_BUSINESS,
        userId: owner.id,
        categories: { create: { categoryId: handyman.id, isPrimary: true } },
        services: {
          create: [
            { title: "Small repairs", categoryId: handyman.id, description: "Doors, shelves, fixtures.", priceFromPence: 7500, priceUnit: "hour" },
            { title: "Furniture assembly", categoryId: handyman.id, priceFromPence: 12000, priceUnit: "job" },
          ],
        },
      },
    });
  }

  await db.siteSetting.upsert({ where: { key: "ads.sideBanners.enabled" }, create: { key: "ads.sideBanners.enabled", value: true }, update: {} });
  console.log(`Seeded. Test logins (password ${TEST_PASSWORD}): ${TEST_LOGINS.map((l) => `${l.email} (${l.role})`).join(", ")}`);
}

main().finally(() => db.$disconnect());
