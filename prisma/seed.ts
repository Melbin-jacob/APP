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
];

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

  await db.siteSetting.upsert({ where: { key: "ads.sideBanners.enabled" }, create: { key: "ads.sideBanners.enabled", value: true }, update: {} });
  console.log(`Seeded. Test logins (password ${TEST_PASSWORD}): ${TEST_LOGINS.map((l) => `${l.email} (${l.role})`).join(", ")}`);
}

main().finally(() => db.$disconnect());
