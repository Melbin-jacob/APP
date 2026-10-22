/* Seed: trade categories, the business directory (prisma/data), the site
 * settings, and two local-testing logins (admin + customer). Safe to re-run.
 * There are no fake business listings: every listing comes from the directory
 * import or from a real sign-up. */
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { CATEGORIES } from "./categories";
import { importDirectory } from "./import-directory";

const db = new PrismaClient();
const TOS = "2026-10-01";

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
  const password = await hash("ChangeMe-123456", { memoryCost: 19456, timeCost: 2, parallelism: 1 });
  await db.user.upsert({
    where: { email: "admin@homeservices.local" },
    create: { email: "admin@homeservices.local", name: "Ops Admin", role: "SUPER_ADMIN", passwordHash: password, tosVersion: TOS, tosAcceptedAt: new Date(), emailVerified: new Date() },
    update: {},
  });
  await db.user.upsert({
    where: { email: "customer@homeservices.local" },
    create: { email: "customer@homeservices.local", name: "Casey Customer", role: "CUSTOMER", passwordHash: password, tosVersion: TOS, tosAcceptedAt: new Date() },
    update: {},
  });

  await db.siteSetting.upsert({ where: { key: "ads.sideBanners.enabled" }, create: { key: "ads.sideBanners.enabled", value: true }, update: {} });
  console.log("Seeded. Test logins (password ChangeMe-123456): admin@homeservices.local, customer@homeservices.local");
}

main().finally(() => db.$disconnect());
