/* Dev seed: categories, a super-admin, ~16 approved traders around London, reviews, banners. */
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

const NAMES = ["Swift", "Capital", "Thames", "Royal", "Greenline", "Northside", "Brightwork", "Keystone"];
const SUFFIX: Record<string, string> = {
  plumbing: "Plumbing & Heating", electrical: "Electrical Ltd", handyman: "Handyman Services", painting: "Decorators",
};

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
      const businessName = `${NAMES[n % NAMES.length]} ${SUFFIX[cat]}${k > 1 ? ` ${k}` : ""}`;
      const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const email = `trader${n}@homeservices.local`;
      if (await db.user.findUnique({ where: { email } })) continue;
      const user = await db.user.create({
        data: {
          email, name: `Trader ${n}`, role: "TRADER", passwordHash: password, tosVersion: TOS, tosAcceptedAt: new Date(),
          trader: {
            create: {
              businessName, slug, phone: `+44 20 7946 0${String(100 + n).padStart(3, "0")}`,
              bio: `Family-run ${bySlug[cat].name.toLowerCase()} business serving London for over ${5 + n} years. Fully insured, free quotes.`,
              hourlyRatePence: 4000 + n * 250, city: "London", postcode: `SW1A ${n % 9}AA`, addressLine: `${n + 2} Whitehall Court`,
              latitude: 51.5034 + (n % 5) * 0.01, longitude: -0.1276 - (n % 4) * 0.012, serviceRadiusKm: 15 + n,
              coverImageUrl: IMAGES[n % IMAGES.length], status: "APPROVED", verifiedAt: new Date(),
              operatingHours: { mon: [{ open: "08:00", close: "18:00" }], tue: [{ open: "08:00", close: "18:00" }], wed: [{ open: "08:00", close: "18:00" }], thu: [{ open: "08:00", close: "18:00" }], fri: [{ open: "08:00", close: "17:00" }] },
              categories: { create: { categoryId: bySlug[cat].id, isPrimary: true } },
              services: { create: { categoryId: bySlug[cat].id, title: `Standard ${bySlug[cat].name.toLowerCase()} call-out`, priceFromPence: 6000, priceUnit: "job" } },
              credentials: { create: { type: "INSURANCE", name: "Public liability insurance £2m", issuer: "Example Insurer", documentUrl: "s3://private/credentials/demo.pdf", status: "VERIFIED" } },
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
        { name: "Spring boiler check", slot: "LEFT", kind: "IMAGE", width: 160, height: 600, imageUrl: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=320&h=1200&q=60", targetUrl: "https://example.com/boiler" },
        { name: "Home insurance partner", slot: "RIGHT", kind: "IMAGE", width: 160, height: 600, imageUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=320&h=1200&q=60", targetUrl: "https://example.com/insurance" },
      ],
    });
  }
  await db.siteSetting.upsert({ where: { key: "ads.sideBanners.enabled" }, create: { key: "ads.sideBanners.enabled", value: true }, update: {} });
  console.log("Seeded. Admin: admin@homeservices.local / ChangeMe-123456");
}

main().finally(() => db.$disconnect());
