"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";
import { usePrefs } from "@/components/providers/PreferencesProvider";
import { Icon } from "@/components/ui/Icon";
import { api } from "@/lib/api-client";

type Suggestion = { type: "category" | "trader"; label: string; slug: string };

function useDebounced<T>(value: T, ms = 200) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Dual input: Location (city/zip) + Keyword/Category with typeahead. */
export function SearchBar({ initial }: { initial?: { q?: string; location?: string } }) {
  const router = useRouter();
  const { t, country, locale } = usePrefs();
  const listId = useId();
  const [location, setLocation] = useState(initial?.location ?? "");
  const [q, setQ] = useState(initial?.q ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const term = useDebounced(q.trim());

  const { data } = useQuery({
    // Suggestions depend on the visitor's market and language.
    queryKey: ["autocomplete", country, locale, term],
    queryFn: () => api<{ suggestions: Suggestion[] }>(`/api/search/autocomplete?q=${encodeURIComponent(term)}`),
    enabled: term.length >= 2,
    staleTime: 5 * 60_000,
  });
  const suggestions = term.length >= 2 ? (data?.suggestions ?? []) : [];

  const go = (s?: Suggestion) => {
    if (s?.type === "trader") return router.push(`/traders/${s.slug}`);
    const params = new URLSearchParams();
    if (location.trim()) params.set("location", location.trim());
    if (s?.type === "category") params.set("category", s.slug);
    else if (q.trim()) params.set("q", q.trim());
    router.push(`/search?${params}`);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setOpen(false);
    go(active >= 0 ? suggestions[active] : undefined);
  };

  return (
    <form role="search" onSubmit={onSubmit} className="relative mx-auto flex w-full max-w-2xl flex-col overflow-visible rounded-xl bg-white shadow-lg sm:flex-row sm:rounded-full">
      <label className="flex items-center gap-2 border-b border-ink-200 px-4 py-3 sm:w-48 sm:border-b-0 sm:border-e">
        <Icon name="pin" className="h-4 w-4 shrink-0 text-brand-500" />
        <span className="sr-only">{t("search.location")}</span>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder={t("search.locationPlaceholder")}
          maxLength={80}
          autoComplete="postal-code"
          className="w-full bg-transparent text-sm outline-none placeholder:text-ink-500"
        />
      </label>
      <div className="relative flex flex-1 items-center">
        <label className="flex-1 px-4 py-3">
          <span className="sr-only">{t("search.query")}</span>
          <input
            role="combobox"
            aria-expanded={open && suggestions.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            value={q}
            maxLength={80}
            onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(-1); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, suggestions.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder={t("search.queryPlaceholder")}
            className="w-full bg-transparent text-sm outline-none placeholder:text-ink-500"
          />
        </label>
        <button type="submit" aria-label={t("search.submit")} className="m-1.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-500 text-white hover:bg-accent-600">
          <Icon name="search" className="h-5 w-5" />
        </button>
        {open && suggestions.length > 0 && (
          <ul id={listId} role="listbox" className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-lg bg-white py-1 text-start shadow-lg">
            {suggestions.map((s, i) => (
              <li
                key={`${s.type}-${s.slug}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => { e.preventDefault(); go(s); }}
                className={`flex cursor-pointer items-center justify-between px-4 py-2 text-sm ${i === active ? "bg-brand-50" : "hover:bg-ink-100"}`}
              >
                <span className="text-ink-900">{s.label}</span>
                <span className="text-xs text-ink-500">{s.type === "category" ? t("search.typeCategory") : t("search.typeBusiness")}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </form>
  );
}
