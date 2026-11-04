// Search engine helpers: absolute URLs and schema.org structured data.

export const siteUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const absoluteUrl = (path: string) => (/^https?:\/\//.test(path) ? path : `${siteUrl()}${path.startsWith("/") ? "" : "/"}${path}`);

/** JSON-LD for a <script type="application/ld+json">: "<" escaped so text can never close the tag. */
export const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");

// The most specific schema.org type for a trade, so Google can show the right
// kind of local result. Anything not listed is a general home-services business.
const SCHEMA_TYPES: Record<string, string> = {
  plumbing: "Plumber",
  electrical: "Electrician",
  hvac: "HVACBusiness",
  roofing: "RoofingContractor",
  painting: "HousePainter",
  renovation: "GeneralContractor",
  "home-builders": "GeneralContractor",
  locksmith: "Locksmith",
  removals: "MovingCompany",
  "motor-garage": "AutoRepair",
  towing: "AutoRepair",
  "real-estate": "RealEstateAgent",
  cleaning: "HomeAndConstructionBusiness",
};
export const schemaTypeFor = (categorySlug?: string | null) => (categorySlug && SCHEMA_TYPES[categorySlug]) || "HomeAndConstructionBusiness";

const DAY_NAMES = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" } as const;
type Hours = Partial<Record<keyof typeof DAY_NAMES, { open: string; close: string }[]>>;

export function openingHoursSpec(hours: Hours) {
  return (Object.keys(DAY_NAMES) as (keyof typeof DAY_NAMES)[]).flatMap((d) =>
    (hours[d] ?? []).map((slot) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: DAY_NAMES[d], opens: slot.open, closes: slot.close })),
  );
}
