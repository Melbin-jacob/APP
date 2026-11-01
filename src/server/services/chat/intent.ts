// Keyword understanding for the chat assistant. Used on its own when the AI
// service is unavailable (no key, outage, timeout), so the assistant always
// answers. Works on the whole conversation: what the visitor needs (a trade)
// and where (a town or postal code), asking for whichever is missing.

/** Words people use for each trade (category slug → keywords, matched as word prefixes). */
export const TRADE_WORDS: Record<string, string[]> = {
  plumbing: ["plumb", "leak", "tap", "faucet", "toilet", "drain", "pipe", "sink", "sewer", "water heater", "clog", "sump"],
  electrical: ["electric", "wiring", "wire", "outlet", "socket", "breaker", "panel", "light fixture", "lighting", "power out", "ev charger"],
  hvac: ["hvac", "furnace", "heating", "heat pump", "air condition", "a/c", "ac unit", "boiler", "duct", "thermostat", "cooling"],
  renovation: ["renovat", "remodel", "contractor", "addition", "basement finish", "kitchen reno", "bathroom reno"],
  handyman: ["handyman", "odd job", "small repair", "fix things", "mount tv", "assemble"],
  painting: ["paint", "decorat", "wallpaper", "stain"],
  roofing: ["roof", "shingle", "flashing"],
  gardening: ["landscap", "garden", "lawn", "yard", "sod", "hedge"],
  "tree-service": ["tree", "stump", "arborist", "branch"],
  "concrete-paving": ["concrete", "paving", "driveway", "asphalt", "interlock", "patio"],
  masonry: ["mason", "brick", "stone", "chimney", "tuckpoint"],
  "excavation-drainage": ["excavat", "drainage", "grading", "trench", "septic"],
  waterproofing: ["waterproof", "foundation", "basement leak", "crack in foundation", "wet basement"],
  carpentry: ["carpent", "deck", "woodwork", "framing", "trim", "stairs"],
  "cabinet-making": ["cabinet", "millwork", "countertop"],
  "drywall-plastering": ["drywall", "plaster", "hole in wall", "ceiling crack"],
  "flooring-tile": ["floor", "tile", "hardwood", "laminate", "vinyl plank", "carpet"],
  insulation: ["insulat", "spray foam", "draft"],
  "windows-doors": ["window", "door"],
  glass: ["glass", "mirror", "glazing", "shower screen"],
  "siding-eavestrough": ["siding", "eavestrough", "gutter", "soffit", "fascia"],
  "garage-doors": ["garage door", "garage opener"],
  fencing: ["fence", "fencing", "gate"],
  "home-builders": ["home builder", "custom home", "new build", "build a house"],
  "appliance-repair": ["appliance", "fridge", "refrigerator", "washer", "dryer", "dishwasher", "oven", "stove", "microwave"],
  locksmith: ["locksmith", "locked out", "lock", "key", "rekey"],
  "pest-control": ["pest", "mice", "mouse", "rat", "bug", "ant", "termite", "wasp", "bed bug", "cockroach", "raccoon"],
  cleaning: ["clean", "maid", "janitor", "carpet clean", "window clean"],
  "snow-removal": ["snow", "plow", "plough", "salting", "property maintenance"],
  "demolition-junk-removal": ["demolition", "demolish", "junk", "debris", "haul", "dumpster", "bin rental"],
  removals: ["mover", "moving", "packers", "relocat"],
  "motor-garage": ["car", "auto", "mechanic", "collision", "brake", "oil change", "vehicle"],
  towing: ["tow", "roadside", "breakdown"],
  welding: ["weld", "metal fabric", "railing"],
  machining: ["machining", "machinist", "tool and die", "cnc"],
  security: ["security", "alarm", "camera", "cctv", "surveillance"],
  "real-estate": ["real estate", "realtor", "sell my house", "buy a house", "home inspection"],
};

const POSTAL = /\b([ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z])\s?(\d[ABCEGHJ-NPRSTV-Z]\d)?\b|\b(\d{5})(?:-\d{4})?\b/i;

export type Intent = { category: string | null; location: string | null };

const fold = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

/**
 * The trade named in this text: the keyword that ends last wins, and on a tie
 * the longer one ("garage door" over "door", "carpet" over "car").
 */
export function findTrade(text: string): string | null {
  const t = ` ${fold(text).replace(/[^a-z0-9/ ]+/g, " ")} `;
  let best: { slug: string; end: number; len: number } | null = null;
  for (const [slug, words] of Object.entries(TRADE_WORDS)) {
    for (const w of words) {
      const at = t.lastIndexOf(` ${w}`);
      if (at < 0) continue;
      const end = at + w.length;
      if (!best || end > best.end || (end === best.end && w.length > best.len)) best = { slug, end, len: w.length };
    }
  }
  return best?.slug ?? null;
}

/** A postal code, or one of the towns we list, mentioned in this text. */
export function findPlace(text: string, towns: string[]): string | null {
  const postal = text.match(POSTAL);
  if (postal) return postal[0].toUpperCase().replace(/\s+/g, " ").trim();
  const t = fold(text);
  // Longest names first, so "Windsor-Essex" wins over "Windsor".
  for (const town of [...towns].sort((a, b) => b.length - a.length)) {
    if (new RegExp(`\\b${fold(town).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(t)) return town;
  }
  return null;
}

/** What the visitor wants so far: the latest trade and place mentioned anywhere in their messages. */
export function readIntent(userMessages: string[], towns: string[]): Intent {
  let category: string | null = null;
  let location: string | null = null;
  for (const m of userMessages) {
    category = findTrade(m) ?? category;
    location = findPlace(m, towns) ?? location;
  }
  return { category, location };
}
