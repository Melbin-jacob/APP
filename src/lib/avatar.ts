// Initials and a stable colour for businesses without a logo.

// Muted, earthy tints (background + darker ink of the same hue): distinct
// enough to tell listings apart, calm enough for a grid of hundreds.
// Every pair keeps the initials above 4.5:1 contrast.
const PALETTE = [
  "bg-[#ece8e1] text-[#6b5d4f]", // sand
  "bg-[#e3e8e0] text-[#4e6147]", // sage
  "bg-[#e1e7ec] text-[#475d6f]", // mist blue
  "bg-[#ebe4e1] text-[#6e5650]", // clay
  "bg-[#e5e5e8] text-[#55566a]", // slate lilac
  "bg-[#e0e9e6] text-[#3f6259]", // eucalyptus
  "bg-[#ede7da] text-[#6a5a36]", // oat
  "bg-[#e6e3ea] text-[#5b5070]", // heather
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
