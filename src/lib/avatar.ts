// Initials and a stable colour for businesses without a logo.

const PALETTE = [
  "bg-brand-600", "bg-sky-600", "bg-violet-600", "bg-rose-600", "bg-amber-600",
  "bg-teal-600", "bg-indigo-600", "bg-fuchsia-700", "bg-emerald-700", "bg-orange-600",
] as const;

// Words that make poor initials ("The Plumbing Co" → "PC", not "TP").
const SKIP = new Set(["the", "and", "of", "a", "an", "&", "-", "inc", "inc.", "ltd", "ltd.", "llc", "corp", "co", "co."]);

export function initials(name: string): string {
  const words = name
    .split(/[\s/]+/)
    .map((w) => w.replace(/^[^\p{L}\p{N}]+/u, ""))
    .filter((w) => w && !SKIP.has(w.toLowerCase()));
  const picked = (words.length ? words : [name.trim()]).slice(0, 2);
  return picked.map((w) => Array.from(w)[0] ?? "").join("").toUpperCase() || "?";
}

export function avatarColour(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return PALETTE[h % PALETTE.length]!;
}
