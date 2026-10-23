import { SearchBar } from "@/components/search/SearchBar";
import { getI18n } from "@/i18n/server";
import { getSetting } from "@/server/settings";

// Built-in background (a neutral neighbourhood skyline, served from /public).
// Super-admins can replace it with a photo in Ops console → Homepage.
export const DEFAULT_HERO_IMAGE = "/images/hero/neighbourhood.svg";

export async function Hero() {
  const [{ t }, uploaded] = await Promise.all([getI18n(), getSetting("home.heroImageUrl").catch(() => "")]);
  const image = uploaded || DEFAULT_HERO_IMAGE;
  return (
    <section className="relative isolate overflow-visible">
      <div
        className="absolute inset-0 -z-10 bg-cover bg-bottom"
        style={{ backgroundImage: `url(${image})` }}
        aria-hidden="true"
      />
      {/* Photos vary, so they get a stronger scrim to keep the white text readable. */}
      <div
        className={`absolute inset-0 -z-10 bg-gradient-to-b ${uploaded ? "from-ink-900/60 via-ink-900/45 to-ink-900/60" : "from-ink-900/30 via-ink-900/10 to-transparent"}`}
        aria-hidden="true"
      />
      <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center sm:py-32">
        <h1 className="text-3xl font-bold text-white drop-shadow sm:text-5xl">{t("hero.title")}</h1>
        <span className="mt-4 block h-1 w-14 rounded-full bg-white/80" aria-hidden="true" />
        <p className="mt-4 max-w-xl text-sm text-white/90 sm:text-base">{t("hero.subtitle")}</p>
        <div className="mt-8 w-full">
          <SearchBar />
        </div>
      </div>
    </section>
  );
}
