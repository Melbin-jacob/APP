import { SearchBar } from "@/components/search/SearchBar";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=2000&q=70";

export function Hero() {
  return (
    <section className="relative isolate overflow-visible">
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: `url(${HERO_IMAGE})` }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink-900/60 via-ink-900/45 to-ink-900/60" aria-hidden="true" />
      <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center sm:py-32">
        <h1 className="text-3xl font-bold text-white drop-shadow sm:text-5xl">Discover Local Experts Near You</h1>
        <span className="mt-4 block h-1 w-14 rounded-full bg-white/80" aria-hidden="true" />
        <p className="mt-4 max-w-xl text-sm text-white/90 sm:text-base">
          Plumbers, electricians, handymen and more — compare rates, browse their work and read verified reviews.
        </p>
        <div className="mt-8 w-full">
          <SearchBar />
        </div>
      </div>
    </section>
  );
}
