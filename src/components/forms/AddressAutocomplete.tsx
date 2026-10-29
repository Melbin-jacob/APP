"use client";

import { useEffect, useId, useRef, useState, type InputHTMLAttributes } from "react";

export type AddressSuggestion = { label: string; addressLine: string; city: string; postcode: string; region: string | null };

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "onSelect"> & {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** Called when the visitor picks a suggestion; fill the other address fields from it. */
  onSelect: (s: AddressSuggestion) => void;
  country: string;
  /** Bias suggestions towards this place (e.g. the business being contacted). */
  near?: { latitude: number; longitude: number } | null;
};

/**
 * Street-address field with type-ahead suggestions (ARIA combobox pattern).
 * Suggestions come from our own /api/geo/address, never straight from the
 * browser to a third party. If none come back, it's just a normal text field.
 */
export function AddressAutocomplete({ id, value, onChange, onSelect, country, near, className, ...input }: Props) {
  const listId = useId();
  const [items, setItems] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const typed = useRef(false); // only look up what the visitor typed, not what they picked
  const lat = near?.latitude;
  const lon = near?.longitude;

  useEffect(() => {
    const q = value.trim();
    if (!typed.current || q.length < 3) { setItems([]); setOpen(false); return; }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      const params = new URLSearchParams({ q, country });
      if (lat != null && lon != null) { params.set("lat", lat.toFixed(2)); params.set("lon", lon.toFixed(2)); }
      try {
        const res = await fetch(`/api/geo/address?${params}`, { signal: ctrl.signal });
        const data = res.ok ? ((await res.json()) as { suggestions: AddressSuggestion[] }) : { suggestions: [] };
        setItems(data.suggestions);
        setActive(-1);
        setOpen(data.suggestions.length > 0);
      } catch {
        /* aborted or offline: keep typing */
      }
    }, 300);
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [value, country, lat, lon]);

  const pick = (s: AddressSuggestion) => {
    typed.current = false;
    setOpen(false);
    setItems([]);
    onSelect(s);
  };

  return (
    <div className="relative">
      <input
        {...input}
        id={id}
        value={value}
        className={className}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="street-address"
        onChange={(e) => { typed.current = true; onChange(e.target.value); }}
        onBlur={() => setOpen(false)}
        onFocus={() => items.length > 0 && setOpen(true)}
        onKeyDown={(e) => {
          if (!open || items.length === 0) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => (i + 1) % items.length); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => (i <= 0 ? items.length - 1 : i - 1)); }
          else if (e.key === "Enter" && active >= 0) { e.preventDefault(); pick(items[active]!); }
          else if (e.key === "Escape") { setOpen(false); }
        }}
      />
      {open && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-ink-200 bg-white shadow-lg">
          <ul id={listId} role="listbox" className="max-h-72 overflow-y-auto py-1">
            {items.map((s, i) => (
              <li
                key={s.label}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                // mousedown, not click: fires before the input's blur closes the list
                onMouseDown={(e) => { e.preventDefault(); pick(s); }}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-start gap-2 px-3 py-2 text-sm ${i === active ? "bg-brand-50 text-brand-700" : "text-ink-700"}`}
              >
                <span aria-hidden="true" className="mt-0.5 text-ink-500">📍</span>
                <span>
                  <span className="block font-medium text-ink-900">{s.addressLine}</span>
                  <span className="block text-xs text-ink-500">{[s.city, s.region, s.postcode].filter(Boolean).join(", ")}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="border-t border-ink-100 px-3 py-1 text-end text-[10px] text-ink-500">© OpenStreetMap contributors</p>
        </div>
      )}
    </div>
  );
}
