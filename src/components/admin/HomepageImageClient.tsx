"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ClientApiError } from "@/lib/api-client";

const MAX = 12 * 1024 * 1024;

export function HomepageImageClient({ current, fallback }: { current: string; fallback: string }) {
  const router = useRouter();
  const [localError, setLocalError] = useState("");
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/admin/homepage", { method: "POST", body });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new ClientApiError(res.status, json?.error?.code ?? "error", json?.error?.message ?? "Upload failed");
      return json;
    },
    onSuccess: () => router.refresh(),
  });
  const reset = useMutation({ mutationFn: () => api("/api/admin/homepage", { method: "DELETE" }), onSuccess: () => router.refresh() });
  const pick = (file?: File) => {
    setLocalError("");
    upload.reset();
    if (!file) return;
    if (!/^image\/(png|jpeg|webp|avif|heic|heif)$/.test(file.type)) return setLocalError("Use a JPEG, PNG or WebP photo.");
    if (file.size > MAX) return setLocalError("That image is over 12 MB.");
    upload.mutate(file);
  };
  const error = localError || (upload.error instanceof ClientApiError ? upload.error.message : upload.error || reset.error ? "Something went wrong" : "");

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <div className="relative h-64 bg-cover bg-bottom" style={{ backgroundImage: `url(${current || fallback})` }}>
          <div className="absolute inset-0 grid place-items-center bg-ink-900/30">
            <p className="text-2xl font-bold text-white drop-shadow">Discover Local Experts Near You</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 p-4">
          <label className="btn-primary cursor-pointer">
            {upload.isPending ? "Uploading…" : "Upload a new picture"}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={upload.isPending}
              onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          {current && (
            <button type="button" className="btn-ghost" disabled={reset.isPending}
              onClick={() => window.confirm("Go back to the built-in picture?") && reset.mutate()}>
              Use the built-in picture
            </button>
          )}
          <span className="text-sm text-ink-500">{current ? "Showing your uploaded picture." : "Showing the built-in picture."}</span>
        </div>
      </div>
      {upload.isSuccess && <p role="status" className="text-sm text-brand-700">✓ Saved. The home page shows it straight away.</p>}
      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      <p className="text-sm text-ink-500">
        Tips: a wide landscape photo works best (at least 2000 px across). Keep the middle fairly calm, since the title and search
        box sit on top, and a dark overlay is added so the text stays readable. Only use photos you own or have a licence for.
      </p>
    </div>
  );
}
