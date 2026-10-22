// Website languages. Native names so people can find their own language
// whatever the page is currently shown in.
export const LOCALES = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "pt", name: "Português" },
  { code: "it", name: "Italiano" },
  { code: "zh", name: "中文" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
  { code: "hi", name: "हिन्दी" },
  { code: "ar", name: "العربية", dir: "rtl" },
  { code: "ru", name: "Русский" },
] as const;

export type Locale = (typeof LOCALES)[number]["code"];
export const DEFAULT_LOCALE: Locale = "en";

export const isLocale = (v: unknown): v is Locale => LOCALES.some((l) => l.code === v);

export const localeDir = (l: Locale): "ltr" | "rtl" =>
  (LOCALES.find((x) => x.code === l) as { dir?: "rtl" } | undefined)?.dir ?? "ltr";

/** Best supported match for an Accept-Language header ("fr-CA,fr;q=0.9,en;q=0.8" → "fr"). */
export function negotiateLocale(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = Number(params.find((p) => p.trim().startsWith("q="))?.split("=")[1] ?? 1);
      return { base: tag.toLowerCase().split("-")[0], q: Number.isFinite(q) ? q : 0 };
    })
    .filter((x) => x.base && x.q > 0)
    .sort((a, b) => b.q - a.q);
  return ranked.find((x) => isLocale(x.base))?.base as Locale | undefined ?? DEFAULT_LOCALE;
}
