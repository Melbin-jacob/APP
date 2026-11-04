import fs from "node:fs";
import { hash } from "@node-rs/argon2";
import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import { MAIL_PORT } from "../playwright.config";
import { TOS_VERSION } from "../src/lib/legal";
// seal() reads the app's key settings when called, i.e. after .env is loaded below.
import { seal } from "../src/lib/secret-box";
import { startInbox } from "./mail";
import { E2E } from "./fixtures";

// Before the tests: start the test inbox, create a staff account with a known
// authenticator secret (staff must use two-step sign-in), and pick an
// unclaimed listing for the claim flow. Returns the teardown.
export default async function globalSetup() {
  if (fs.existsSync(".env") && !process.env.CI) process.loadEnvFile(".env");
  const inbox = await startInbox(MAIL_PORT);

  const db = new PrismaClient();
  try {
    const passwordHash = await hash(E2E.password, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
    const admin = {
      name: "E2E Admin", role: "SUPER_ADMIN" as const, status: "ACTIVE" as const, passwordHash, deletedAt: null,
      tosVersion: TOS_VERSION, tosAcceptedAt: new Date(), ageConfirmedAt: new Date(), emailVerified: new Date(),
      mfaSecret: seal(E2E.adminTotpSecret), mfaEnabledAt: new Date(), mfaLastStep: null, sessionVersion: 0,
    };
    await db.user.upsert({ where: { email: E2E.adminEmail }, create: { email: E2E.adminEmail, ...admin }, update: admin });
    // Two unclaimed listings: one to request a quote from, one to claim.
    const listings = await db.traderProfile.findMany({
      where: { status: "APPROVED", userId: null, claims: { none: {} }, phone: { not: "" } },
      orderBy: { businessName: "asc" },
      take: 2,
      select: { slug: true, businessName: true },
    });
    if (listings.length < 2) throw new Error("Not enough unclaimed listings left for the tests: re-seed the database");
    fs.writeFileSync(E2E.stateFile, JSON.stringify({ forQuote: listings[0], forClaim: listings[1] }));
  } finally {
    await db.$disconnect();
  }
  // Every test signs up and signs in from the same address: start with fresh
  // rate-limit counters so earlier runs don't trip them.
  const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
  try {
    const keys = await redis.keys("rl:*");
    if (keys.length) await redis.del(...keys);
  } finally {
    redis.disconnect();
  }
  return async () => { inbox.close(); };
}
