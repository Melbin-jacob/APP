"use client";

import { useEffect, useRef, useState } from "react";
import { api, ClientApiError } from "@/lib/api-client";
import { parsePostcode } from "@/lib/postcode";

export type VerifiedLocation = {
  postcode: string;
  city: string;
  region: string | null;
  country: "GB" | "US";
  latitude: number;
  longitude: number;
};

type State =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "ok"; location: VerifiedLocation }
  | { kind: "error"; message: string };

/**
 * Postcode / ZIP field that looks the code up as soon as it's complete and
 * reports the matched place. The parent unlocks the rest of the form only
 * once `onChange` receives a location.
 */
export function PostcodeLookup({ onChange, serverError }: { onChange: (loc: VerifiedLocation | null) => void; serverError?: string }) {
  const [value, setValue] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const latest = useRef(0);
  const verified = useRef<string | null>(null); // postcode of the current match
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const check = async (raw: string) => {
    const parsed = parsePostcode(raw);
    if (!parsed) {
      setState({ kind: "error", message: "Enter a full UK postcode (e.g. SW1A 1AA) or a 5-digit US ZIP code." });
      return;
    }
    const id = ++latest.current;
    setState({ kind: "checking" });
    try {
      const { location } = await api<{ location: VerifiedLocation }>(`/api/geo/postcode?code=${encodeURIComponent(parsed.code)}`);
      if (id !== latest.current) return; // a newer lookup superseded this one
      verified.current = location.postcode;
      setValue(location.postcode);
      setState({ kind: "ok", location });
      onChangeRef.current(location);
    } catch (err) {
      if (id !== latest.current) return;
      setState({ kind: "error", message: err instanceof ClientApiError ? err.message : "We couldn't check your postcode. Please try again." });
    }
  };

  // Look up automatically once the code is complete; any edit re-locks the form.
  useEffect(() => {
    // Reformatting the field to the matched postcode isn't a new edit.
    if (verified.current && parsePostcode(value)?.code === verified.current) return;
    verified.current = null;
    onChangeRef.current(null);
    if (!parsePostcode(value)) {
      latest.current++;
      setState({ kind: "idle" });
      return;
    }
    const t = setTimeout(() => check(value), 400);
    return () => clearTimeout(t);
  }, [value]);

  const message = state.kind === "error" ? state.message : serverError;

  return (
    <div className="sm:col-span-2">
      <label htmlFor="postcode" className="label">Business postcode / ZIP</label>
      <div className="flex gap-2">
        <input
          id="postcode"
          name="postcode"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => value.trim() && state.kind !== "ok" && state.kind !== "checking" && check(value)}
          required
          maxLength={10}
          autoComplete="postal-code"
          placeholder="e.g. SW1A 1AA or 90210"
          aria-invalid={state.kind === "error"}
          aria-describedby="postcode-status"
          className="input uppercase sm:max-w-xs"
        />
        <button type="button" onClick={() => check(value)} disabled={state.kind === "checking" || !value.trim()} className="btn-ghost shrink-0 px-4">
          {state.kind === "checking" ? "Checking…" : "Find"}
        </button>
      </div>
      <div id="postcode-status" aria-live="polite" className="mt-2 min-h-5 text-sm">
        {state.kind === "ok" && (
          <p className="flex items-center gap-2 rounded-md bg-brand-50 px-3 py-2 text-brand-700">
            <span aria-hidden="true">✓</span>
            <span>
              <strong>{state.location.postcode}</strong> matched to {state.location.city}
              {state.location.region && state.location.region !== state.location.city && `, ${state.location.region}`}
              {state.location.country === "US" ? ", USA" : ", UK"}
            </span>
          </p>
        )}
        {state.kind === "checking" && <p className="text-ink-500">Looking up your postcode…</p>}
        {message && state.kind !== "ok" && state.kind !== "checking" && <p className="text-rose-600">{message}</p>}
        {state.kind === "idle" && !message && <p className="text-ink-500">Start here: we use your postcode to place your business on the map.</p>}
      </div>
    </div>
  );
}
