/* Imports business listings compiled from public directories (see
 * scripts/directory/convert_xlsx.py). Safe to re-run: listings are matched by
 * importRef, updated in place unless the business has claimed them, and
 * unclaimed listings that disappeared from the file are removed.
 *
 * Standalone:  npm run db:import-directory [-- path/to/file.json]
 */
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

type Listing = {
  ref: string; name: string; slug: string; category: string; city: string; addressLine: string | null; postcode: string;
  latitude: number; longitude: number; serviceRadiusKm: number; phone: string; website: string | null; notes: string | null;
};
type DirectoryFile = { source: string; country: string; currency: string; listings: Listing[] };

export const DEFAULT_DIRECTORY = "prisma/data/windsor-essex-directory.json";

export async function importDirectory(db: PrismaClient, file = DEFAULT_DIRECTORY) {
  const data = JSON.parse(readFileSync(file, "utf8")) as DirectoryFile;
  const categories = new Map((await db.category.findMany({ select: { id: true, slug: true } })).map((c) => [c.slug, c.id]));
  const missing = [...new Set(data.listings.map((l) => l.category))].filter((s) => !categories.has(s));
  if (missing.length) throw new Error(`Unknown categories in ${file}: ${missing.join(", ")}`);

  const claimed = new Set(
    (await db.traderProfile.findMany({ where: { importRef: { startsWith: `${data.source}:` }, userId: { not: null } }, select: { importRef: true } }))
      .map((t) => t.importRef),
  );
  // Slugs already used by businesses that signed up themselves.
  const taken = new Set(
    (await db.traderProfile.findMany({ where: { importRef: null }, select: { slug: true } })).map((t) => t.slug),
  );

  let created = 0, updated = 0, skipped = 0;
  for (let i = 0; i < data.listings.length; i += 100) {
    const batch = data.listings.slice(i, i + 100);
    await db.$transaction(async (tx) => {
      for (const l of batch) {
        if (claimed.has(l.ref)) { skipped++; continue; }
        const categoryId = categories.get(l.category)!;
        const fields = {
          businessName: l.name, phone: l.phone, website: l.website, importNotes: l.notes,
          city: l.city, addressLine: l.addressLine, postcode: l.postcode, country: data.country, currency: data.currency,
          latitude: l.latitude, longitude: l.longitude, serviceRadiusKm: l.serviceRadiusKm,
        };
        const existing = await tx.traderProfile.findUnique({ where: { importRef: l.ref }, select: { id: true } });
        if (existing) {
          await tx.traderProfile.update({ where: { id: existing.id }, data: fields });
          await tx.traderCategory.deleteMany({ where: { traderId: existing.id, categoryId: { not: categoryId } } });
          await tx.traderCategory.upsert({
            where: { traderId_categoryId: { traderId: existing.id, categoryId } },
            create: { traderId: existing.id, categoryId, isPrimary: true },
            update: { isPrimary: true },
          });
          updated++;
        } else {
          const slug = taken.has(l.slug) ? `${l.slug}-${l.ref.split(":")[1]}` : l.slug;
          await tx.traderProfile.create({
            data: { ...fields, slug, importRef: l.ref, status: "APPROVED", categories: { create: { categoryId, isPrimary: true } } },
          });
          created++;
        }
      }
    }, { timeout: 60_000 });
  }

  const refs = data.listings.map((l) => l.ref);
  const removed = await db.traderProfile.deleteMany({
    where: { importRef: { startsWith: `${data.source}:`, notIn: refs }, userId: null },
  });
  return { source: data.source, created, updated, skippedClaimed: skipped, removed: removed.count };
}

// Run directly: tsx prisma/import-directory.ts [file]
if (process.argv[1]?.endsWith("import-directory.ts")) {
  const db = new PrismaClient();
  importDirectory(db, process.argv[2])
    .then((r) => console.log("Directory import:", r))
    .catch((e) => { console.error(e); process.exitCode = 1; })
    .finally(() => db.$disconnect());
}
