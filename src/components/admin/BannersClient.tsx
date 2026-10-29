"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { api, ClientApiError } from "@/lib/api-client";
import { Badge, PageTitle } from "./ui";

type Banner = {
  id: string; name: string; slot: Slot; kind: "IMAGE" | "SCRIPT"; imageUrl: string | null; targetUrl: string | null;
  width: number; height: number; weight: number; isActive: boolean; startsAt: string | null; endsAt: string | null;
  stats: { impressions: number; clicks: number; ctr: number };
};

type Slot = "LEFT" | "RIGHT" | "LEADERBOARD" | "MOBILE";
// Where each slot shows, and the sizes it takes (the API enforces these).
const SLOTS: Record<Slot, { label: string; sizes: [number, number][] }> = {
  LEFT: { label: "Left rail (wide desktops)", sizes: [[160, 600], [300, 600], [300, 250]] },
  RIGHT: { label: "Right rail (wide desktops)", sizes: [[160, 600], [300, 600], [300, 250]] },
  LEADERBOARD: { label: "Tablet & laptop banners (top + in listings)", sizes: [[728, 90]] },
  MOBILE: { label: "Phone banners (top + in listings)", sizes: [[320, 100], [320, 50]] },
};

function GlobalSwitch() {
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ["settings"], queryFn: () => api<{ settings: Record<string, unknown> }>("/api/admin/settings") });
  const enabled = settings.data?.settings["ads.sideBanners.enabled"] === true;
  const toggle = useMutation({
    mutationFn: (value: boolean) => api("/api/admin/settings", { method: "PUT", json: { key: "ads.sideBanners.enabled", value } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });

  return (
    <section className="card mb-6 flex items-center justify-between gap-4 p-5">
      <div>
        <h2 className="font-semibold">Ad banners — site-wide</h2>
        <p className="text-sm text-ink-500">
          Instantly shows or hides every banner on every public page: the left &amp; right rails on wide desktops, and the
          banners at the top of the page and among listings on laptops, tablets and phones.
        </p>
      </div>
      <button
        role="switch"
        aria-checked={enabled}
        aria-label="Toggle ad banners"
        disabled={settings.isLoading || toggle.isPending}
        onClick={() => toggle.mutate(!enabled)}
        className={`relative h-8 w-14 shrink-0 rounded-full transition ${enabled ? "bg-brand-500" : "bg-ink-200"}`}
      >
        <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${enabled ? "left-7" : "left-1"}`} />
      </button>
    </section>
  );
}

function NewBannerForm({ onDone }: { onDone: () => void }) {
  const [kind, setKind] = useState<"IMAGE" | "SCRIPT">("IMAGE");
  const [slot, setSlot] = useState<Slot>("LEFT");
  const [size, setSize] = useState("160x600");
  const create = useMutation({
    mutationFn: (body: object) => api("/api/admin/banners", { method: "POST", json: body }),
    onSuccess: onDone,
  });
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const s = (k: string) => (String(f.get(k) ?? "").trim() || undefined);
    const [width, height] = size.split("x").map(Number);
    create.mutate({
      name: s("name"), slot, kind, width, height,
      weight: Number(s("weight") ?? 1), imageUrl: s("imageUrl"), targetUrl: s("targetUrl"), scriptHtml: s("scriptHtml"),
      startsAt: s("startsAt"), endsAt: s("endsAt"),
    });
  };
  return (
    <form onSubmit={submit} className="card mb-6 grid gap-3 p-5 sm:grid-cols-4">
      <h2 className="font-semibold sm:col-span-4">New banner</h2>
      <input name="name" required placeholder="Name" className="input sm:col-span-2" />
      <select value={slot} aria-label="Where it shows" className="input"
        onChange={(e) => { const v = e.target.value as Slot; setSlot(v); setSize(SLOTS[v].sizes[0]!.join("x")); }}>
        {(Object.keys(SLOTS) as Slot[]).map((k) => <option key={k} value={k}>{SLOTS[k].label}</option>)}
      </select>
      <select value={kind} onChange={(e) => setKind(e.target.value as "IMAGE" | "SCRIPT")} className="input">
        <option value="IMAGE">Image + link</option><option value="SCRIPT">Script tag (AdSense…)</option>
      </select>
      <select value={size} onChange={(e) => setSize(e.target.value)} aria-label="Size" className="input">
        {SLOTS[slot].sizes.map(([w, h]) => <option key={`${w}x${h}`} value={`${w}x${h}`}>{w} × {h} px</option>)}
      </select>
      <input name="weight" type="number" defaultValue={1} min={1} max={100} className="input" aria-label="Rotation weight" />
      <span />
      {kind === "IMAGE" ? (
        <>
          <input name="imageUrl" type="text" required placeholder="Image: https://… or /images/…" className="input sm:col-span-2" />
          <input name="targetUrl" type="text" required placeholder="Link: https://… or a page here, e.g. /search" className="input sm:col-span-2" />
        </>
      ) : (
        <textarea name="scriptHtml" required rows={4} placeholder="<script async src=…></script>" className="input font-mono text-xs sm:col-span-4" />
      )}
      <label className="text-xs text-ink-500">Starts<input name="startsAt" type="datetime-local" className="input" /></label>
      <label className="text-xs text-ink-500">Ends<input name="endsAt" type="datetime-local" className="input" /></label>
      <div className="flex items-end sm:col-span-2"><button className="btn-primary w-full" disabled={create.isPending}>Create banner</button></div>
      {create.error && <p className="text-sm text-rose-600 sm:col-span-4">{create.error instanceof ClientApiError ? create.error.message : "Failed"}</p>}
      {kind === "SCRIPT" && (
        <p className="text-xs text-ink-500 sm:col-span-4">Script banners run in a sandboxed iframe with an isolated origin; they can&apos;t access site cookies or pages.</p>
      )}
    </form>
  );
}

export function AdminBannersClient() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const list = useQuery({ queryKey: ["banners"], queryFn: () => api<{ banners: Banner[] }>("/api/admin/banners") });
  const refresh = () => qc.invalidateQueries({ queryKey: ["banners"] });
  const patch = useMutation({
    mutationFn: ({ id, ...body }: { id: string; isActive: boolean }) => api(`/api/admin/banners/${id}`, { method: "PATCH", json: body }),
    onSuccess: refresh,
  });
  const remove = useMutation({ mutationFn: (id: string) => api(`/api/admin/banners/${id}`, { method: "DELETE" }), onSuccess: refresh });

  return (
    <>
      <PageTitle actions={<button className="btn-primary" onClick={() => setCreating((c) => !c)}>{creating ? "Cancel" : "New banner"}</button>}>
        Ad banners
      </PageTitle>
      <GlobalSwitch />
      {creating && <NewBannerForm onDone={() => { setCreating(false); refresh(); }} />}
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-100 text-xs uppercase text-ink-500">
            <tr><th className="p-3">Banner</th><th>Slot</th><th>Size</th><th>Impr. (30d)</th><th>Clicks</th><th>CTR</th><th>Status</th><th /></tr>
          </thead>
          <tbody className="divide-y divide-ink-200">
            {list.data?.banners.map((b) => (
              <tr key={b.id}>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {b.imageUrl ? <img src={/^https?:\/\//.test(b.imageUrl) ? `/api/banners/${b.id}/image` : b.imageUrl} alt="" className="h-12 w-20 rounded object-contain" /> : <span className="grid h-12 w-20 place-items-center rounded bg-ink-100 text-[10px]">JS</span>}
                    <span>{b.name}<span className="block max-w-[16rem] truncate text-xs text-ink-500">{b.targetUrl ?? "script tag"}</span></span>
                  </div>
                </td>
                <td>{SLOTS[b.slot]?.label ?? b.slot}</td>
                <td>{b.width}×{b.height}</td>
                <td>{b.stats.impressions.toLocaleString()}</td>
                <td>{b.stats.clicks.toLocaleString()}</td>
                <td>{(b.stats.ctr * 100).toFixed(2)}%</td>
                <td><Badge tone={b.isActive ? "good" : "neutral"}>{b.isActive ? "Active" : "Paused"}</Badge></td>
                <td className="space-x-2 pr-3 text-right">
                  <button className="text-xs underline" onClick={() => patch.mutate({ id: b.id, isActive: !b.isActive })}>{b.isActive ? "Pause" : "Activate"}</button>
                  <button className="text-xs text-rose-700 underline" onClick={() => confirm(`Delete "${b.name}"?`) && remove.mutate(b.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.data?.banners.length === 0 && <p className="p-6 text-center text-sm text-ink-500">No banners yet.</p>}
      </div>
    </>
  );
}
