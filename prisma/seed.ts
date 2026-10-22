/* Dev seed: categories, a super-admin, 16 approved traders (8 in New York, 8 in
 * Toronto), reviews, banners. Re-running it updates the demo traders in place. */
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";

const db = new PrismaClient();
const TOS = "2026-10-01";

const CATEGORIES = [
  ["plumbing", "Plumbing", "plumbing"], ["electrical", "Electrical", "electrical"], ["handyman", "Handyman", "handyman"],
  ["painting", "Painting & Decorating", "painting"], ["security", "Security Services", "security"], ["cleaning", "Cleaning", "cleaning"],
  ["gardening", "Gardening", "garden"], ["removals", "Packers & Movers", "moving"], ["pest-control", "Pest Control", "pest"],
  ["motor-garage", "Motor Garage", "garage"], ["roofing", "Roofing", "roofing"], ["real-estate", "Real Estate", "home"],
] as const;

const IMAGES = [
  "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=800&q=60",
  "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=60",
  "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=800&q=60",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=60",
];

const NAMES = ["Swift", "Capital", "Hudson", "Royal", "Greenline", "Northside", "Brightwork", "Keystone"];
const SUFFIX: Record<string, string> = {
  plumbing: "Plumbing & Heating", electrical: "Electric Co.", handyman: "Handyman Services", painting: "Painters",
};

// Launch markets. Real postal codes with their published coordinates.
const MARKETS = {
  US: {
    city: "New York", currency: "USD", phone: "+1 212 555 01", street: "Broadway",
    areas: [["10001", 40.7506, -73.9971], ["10003", 40.7317, -73.9892], ["10011", 40.7418, -74.0002], ["10016", 40.7459, -73.9781],
      ["10019", 40.7651, -73.9858], ["10022", 40.7584, -73.9677], ["10013", 40.7201, -74.0049], ["10002", 40.7157, -73.9863]],
  },
  CA: {
    city: "Toronto", currency: "CAD", phone: "+1 416 555 01", street: "King Street West",
    areas: [["M5V 3L9", 43.6426, -79.3871], ["M5H 2N2", 43.6503, -79.3832], ["M4W 1A8", 43.6799, -79.3810], ["M5A 1A1", 43.6544, -79.3607],
      ["M6J 1H3", 43.6484, -79.4197], ["M5T 1R5", 43.6534, -79.3977], ["M4Y 1R5", 43.6656, -79.3832], ["M5S 1A1", 43.6629, -79.3957]],
  },
} as const;

async function main() {
  const password = await hash("ChangeMe-123456", { memoryCost: 19456, timeCost: 2, parallelism: 1 });

  for (const [i, [slug, name, icon]] of CATEGORIES.entries()) {
    await db.category.upsert({ where: { slug }, create: { slug, name, icon, sortOrder: i }, update: { name, icon } });
  }
  const cats = await db.category.findMany();
  const bySlug = Object.fromEntries(cats.map((c) => [c.slug, c]));

  await db.user.upsert({
    where: { email: "admin@homeservices.local" },
    create: { email: "admin@homeservices.local", name: "Ops Admin", role: "SUPER_ADMIN", passwordHash: password, tosVersion: TOS, tosAcceptedAt: new Date(), emailVerified: new Date() },
    update: {},
  });

  const featured = ["plumbing", "electrical", "handyman", "painting"];
  let n = 0;
  for (const cat of featured) {
    for (let k = 0; k < 4; k++, n++) {
      // Two of each trade per market, so every filter tab has results in both.
      const country = k < 2 ? "US" : "CA";
      const m = MARKETS[country];
      const [postcode, latitude, longitude] = m.areas[n % m.areas.length];
      const businessName = `${NAMES[n % NAMES.length]} ${SUFFIX[cat]}${k % 2 ? ` ${m.city}` : ""}`;
      const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "");
      const email = `trader${n}@homeservices.local`;
      const profile = {
        businessName, slug, phone: `${m.phone}${String(10 + n).padStart(2, "0")}`,
        bio: `Family-run ${bySlug[cat].name.toLowerCase()} business serving ${m.city} for over ${5 + n} years. Fully insured, free quotes.`,
        hourlyRatePence: 6500 + n * 300, currency: m.currency, country, city: m.city, postcode,
        addressLine: `${100 + n * 7} ${m.street}`, latitude, longitude, serviceRadiusKm: 15 + n,
        coverImageUrl: IMAGES[n % IMAGES.length], status: "APPROVED" as const,
      };

      const existing = await db.user.findUnique({ where: { email }, include: { trader: true } });
      if (existing?.trader) {
        // Earlier seeds placed demo traders elsewhere; move them to the launch markets.
        await db.traderProfile.update({ where: { id: existing.trader.id }, data: profile });
        await db.service.updateMany({ where: { traderId: existing.trader.id }, data: { priceFromPence: 9000 } });
        await db.credential.updateMany({ where: { traderId: existing.trader.id, type: "INSURANCE" }, data: { name: "General liability insurance, $2M" } });
        continue;
      }
      const user = await db.user.create({
        data: {
          email, name: `Trader ${n}`, role: "TRADER", passwordHash: password, tosVersion: TOS, tosAcceptedAt: new Date(),
          trader: {
            create: {
              ...profile, verifiedAt: new Date(),
              operatingHours: { mon: [{ open: "08:00", close: "18:00" }], tue: [{ open: "08:00", close: "18:00" }], wed: [{ open: "08:00", close: "18:00" }], thu: [{ open: "08:00", close: "18:00" }], fri: [{ open: "08:00", close: "17:00" }] },
              categories: { create: { categoryId: bySlug[cat].id, isPrimary: true } },
              services: { create: { categoryId: bySlug[cat].id, title: `Standard ${bySlug[cat].name.toLowerCase()} call-out`, priceFromPence: 9000, priceUnit: "job" } },
              credentials: { create: { type: "INSURANCE", name: "General liability insurance, $2M", issuer: "Example Insurer", documentUrl: "s3://private/credentials/demo.pdf", status: "VERIFIED" } },
            },
          },
        },
        include: { trader: true },
      });
      const traderId = user.trader!.id;
      const ratings = [5, 4, 5, 3, 5].slice(0, 2 + (n % 4));
      for (const [r, rating] of ratings.entries()) {
        await db.review.create({
          data: { traderId, authorName: ["Sarah K.", "James P.", "Amira L.", "Tom W.", "Priya S."][r], rating, comment: "Turned up on time, tidy work and a fair price.", isVerified: true, publishedAt: new Date() },
        });
      }
      const agg = await db.review.aggregate({ where: { traderId }, _avg: { rating: true }, _count: true });
      await db.traderProfile.update({ where: { id: traderId }, data: { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count } });
    }
  }

  if ((await db.banner.count()) === 0) {
    await db.banner.createMany({
      data: [
        { name: "Fall furnace check", slot: "LEFT", kind: "IMAGE", width: 160, height: 600, imageUrl: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=320&h=1200&q=60", targetUrl: "https://example.com/boiler" },
        { name: "Home insurance partner", slot: "RIGHT", kind: "IMAGE", width: 160, height: 600, imageUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=320&h=1200&q=60", targetUrl: "https://example.com/insurance" },
      ],
    });
  }
  // ── Fixtures for manual testing ───────────────────────────────────────────
  await db.user.upsert({
    where: { email: "customer@homeservices.local" },
    create: { email: "customer@homeservices.local", name: "Casey Customer", role: "CUSTOMER", passwordHash: password, tosVersion: TOS, tosAcceptedAt: new Date() },
    update: {},
  });

  // A trader waiting in the admin approval queue, with a credential to verify.
  const pendingProfile = {
    businessName: "Pending Roofing Co", slug: "pending-roofing-co", phone: "+1 212 555 0199", city: "New York", postcode: "10019",
    country: "US", currency: "USD", latitude: 40.7651, longitude: -73.9858, hourlyRatePence: 8500,
  };
  const pendingUser = await db.user.findUnique({ where: { email: "pending@homeservices.local" }, include: { trader: true } });
  if (pendingUser?.trader) {
    await db.traderProfile.update({ where: { id: pendingUser.trader.id }, data: pendingProfile });
  } else if (!pendingUser) {
    await db.user.create({
      data: {
        email: "pending@homeservices.local", name: "Pat Pending", role: "TRADER", passwordHash: password, tosVersion: TOS, tosAcceptedAt: new Date(),
        trader: {
          create: {
            ...pendingProfile, status: "PENDING",
            categories: { create: { categoryId: bySlug["roofing"].id, isPrimary: true } },
            credentials: { create: { type: "LICENSE", name: "Home improvement contractor license", issuer: "NYC Dept. of Consumer and Worker Protection", documentUrl: "s3://private/credentials/pending.pdf" } },
          },
        },
      },
    });
  }

  const trader0 = await db.traderProfile.findFirst({ where: { user: { email: "trader0@homeservices.local" } } });
  if (trader0) {
    // Open jobs to mark "Completed" → review email lands in the test inbox.
    if ((await db.job.count({ where: { traderId: trader0.id } })) === 0) {
      await db.job.createMany({
        data: [
          { traderId: trader0.id, title: "Replace kitchen tap", customerEmail: "customer@homeservices.local", customerName: "Casey" },
          { traderId: trader0.id, title: "Boiler annual service", customerEmail: "alex@example.test", customerName: "Alex" },
        ],
      });
    }
    // A review in the moderation queue.
    if (!(await db.review.findFirst({ where: { traderId: trader0.id, status: "PENDING_MODERATION" } }))) {
      const flagged = await db.review.create({
        data: { traderId: trader0.id, authorName: "Spammy McSpam", rating: 1, comment: "TERRIBLE!!! visit www.cheap-deals.biz instead", status: "PENDING_MODERATION", reportCount: 3 },
      });
      await db.reviewReport.create({ data: { reviewId: flagged.id, reason: "SPAM", details: "Advertising a competitor" } });
    }
  }

  await db.siteSetting.upsert({ where: { key: "ads.sideBanners.enabled" }, create: { key: "ads.sideBanners.enabled", value: true }, update: {} });
  console.log("Seeded. Password for all demo accounts: ChangeMe-123456");
  console.log("  admin@homeservices.local (super-admin) · trader0@homeservices.local (trader) · customer@homeservices.local (customer)");
}

main().finally(() => db.$disconnect());
