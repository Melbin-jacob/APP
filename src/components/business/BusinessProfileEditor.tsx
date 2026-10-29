"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { usePrefs } from "@/components/providers/PreferencesProvider";
import { api, apiForm, ClientApiError } from "@/lib/api-client";
import { BusinessAvatar } from "@/components/traders/BusinessAvatar";
import { formatMoney } from "@/lib/format";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const UNITS = ["hour", "job", "visit", "day", "sqft", "sqm"] as const;
type Day = (typeof DAYS)[number];
type Unit = (typeof UNITS)[number];

type Service = { id: string; title: string; categoryId: string; description: string; priceFromPence: number | null; priceUnit: string | null };

export type EditorData = {
  slug: string;
  status: string;
  currency: string;
  country: string;
  areaExample: string;
  details: {
    businessName: string; phone: string; bio: string; hourlyRatePence: number | null; serviceRadiusKm: number; logoUrl: string; coverImageUrl: string;
  };
  location: { city: string; postcode: string };
  hours: Partial<Record<Day, { open: string; close: string }[]>>;
  categories: { id: string; slug: string; name: string }[];
  trades: { categoryId: string; isPrimary: boolean }[];
  services: Service[];
  areas: string[];
  gallery: { url: string; caption: string }[];
};

// Money inputs are whole units of the business's currency; the API stores cents.
const toMinor = (v: string) => (v.trim() === "" ? null : Math.round(Number(v) * 100));
const toMajor = (minor: number | null) => (minor == null ? "" : String(minor / 100));

function errorText(err: unknown, fallback: string) {
  // Business-rule messages (e.g. "Move or remove X before removing its trade") come from the server.
  return err instanceof ClientApiError && err.status < 500 && err.code !== "validation_error" ? err.message : fallback;
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="card space-y-4 p-6">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {hint && <p className="mt-1 text-sm text-ink-500">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function SaveRow({ pending, success, error, label }: { pending: boolean; success: boolean; error: string; label: string }) {
  const { t } = usePrefs();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button className="btn-primary" disabled={pending}>{label}</button>
      {success && <span role="status" className="text-sm text-brand-700">✓ {t("business.saved")}</span>}
      {error && <span role="alert" className="text-sm text-rose-600">{error}</span>}
    </div>
  );
}

export function BusinessProfileEditor({ data }: { data: EditorData }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <LogoSection data={data} />
        <DetailsSection data={data} />
        <LocationSection data={data} />
        <HoursSection data={data} />
      </div>
      <div className="space-y-6">
        <TradesSection data={data} />
        <ServicesSection data={data} />
        <AreasSection data={data} />
        <GallerySection data={data} />
      </div>
    </div>
  );
}

// ─── Logo ───────────────────────────────────────────────────────────────────

const MAX_LOGO_BYTES = 5 * 1024 * 1024;

function LogoSection({ data }: { data: EditorData }) {
  const { t } = usePrefs();
  const router = useRouter();
  const [logo, setLogo] = useState(data.details.logoUrl);
  const [localError, setLocalError] = useState("");
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const body = new FormData();
      body.set("file", file);
      return apiForm<{ logoUrl: string }>("/api/trader/logo", body);
    },
    onSuccess: (r) => { setLogo(r.logoUrl); router.refresh(); },
  });
  const remove = useMutation({
    mutationFn: () => api("/api/trader/logo", { method: "DELETE" }),
    onSuccess: () => { setLogo(""); router.refresh(); },
  });
  const pick = (file: File | undefined) => {
    setLocalError("");
    upload.reset();
    if (!file) return;
    if (!/^image\/(png|jpeg|webp|gif|avif|heic|heif)$/.test(file.type)) return setLocalError(t("business.logoType"));
    if (file.size > MAX_LOGO_BYTES) return setLocalError(t("business.logoTooBig"));
    upload.mutate(file);
  };
  const error = localError || (upload.error instanceof ClientApiError && upload.error.status < 500 ? upload.error.message : upload.error || remove.error ? t("common.somethingWrong") : "");

  return (
    <Section title={t("business.logo")} hint={t("business.logoHint")}>
      <div className="flex flex-wrap items-center gap-4">
        <BusinessAvatar name={data.details.businessName} logoUrl={logo || null} className="h-24 w-24 rounded-xl" textClassName="text-3xl" alt={t("business.logo")} />
        <div className="space-y-2">
          <label className="btn-primary cursor-pointer">
            {upload.isPending ? t("business.uploading") : logo ? t("business.logoReplace") : t("business.logoUpload")}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={upload.isPending}
              onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          {logo && (
            <button type="button" className="ms-2 text-sm text-rose-700 underline" disabled={remove.isPending}
              onClick={() => window.confirm(t("business.logoConfirmRemove")) && remove.mutate()}>
              {t("business.remove")}
            </button>
          )}
          <p className="text-xs text-ink-500">{t("business.logoFormats")}</p>
          {upload.isSuccess && <p role="status" className="text-sm text-brand-700">✓ {t("business.saved")}</p>}
          {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
        </div>
      </div>
    </Section>
  );
}

// ─── Business details ───────────────────────────────────────────────────────

function DetailsSection({ data }: { data: EditorData }) {
  const { t } = usePrefs();
  const router = useRouter();
  const [f, setF] = useState({ ...data.details, hourlyRate: toMajor(data.details.hourlyRatePence) });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => { setF((v) => ({ ...v, [k]: e.target.value })); m.reset(); };
  const m = useMutation({
    mutationFn: () =>
      api("/api/trader/me", {
        method: "PATCH",
        json: {
          businessName: f.businessName,
          phone: f.phone,
          bio: f.bio,
          hourlyRatePence: toMinor(f.hourlyRate),
          serviceRadiusKm: Number(f.serviceRadiusKm),
          coverImageUrl: f.coverImageUrl.trim() || null,
        },
      }) as Promise<{ coverImageUrl: string | null }>,
    onSuccess: (r) => { setF((v) => ({ ...v, coverImageUrl: r.coverImageUrl ?? "" })); router.refresh(); },
  });
  return (
    <Section title={t("business.details")}>
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); m.mutate(); }} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="b-name" label={t("business.businessName")}><input id="b-name" required minLength={2} maxLength={100} value={f.businessName} onChange={set("businessName")} className="input" /></Field>
          <Field id="b-phone" label={t("business.phone")}><input id="b-phone" required type="tel" value={f.phone} onChange={set("phone")} className="input" dir="ltr" /></Field>
          <Field id="b-rate" label={t("business.hourlyRate", { currency: data.currency })}>
            <input id="b-rate" type="number" min={0} step="1" value={f.hourlyRate} onChange={set("hourlyRate")} className="input" />
          </Field>
          <Field id="b-radius" label={t("business.radius")}>
            <input id="b-radius" type="number" min={1} max={300} required value={f.serviceRadiusKm} onChange={set("serviceRadiusKm")} className="input" />
          </Field>
        </div>
        <Field id="b-bio" label={t("business.bio")}><textarea id="b-bio" rows={5} maxLength={4000} value={f.bio} onChange={set("bio")} className="input" /></Field>
        <Field id="b-cover" label={t("business.coverUrl")} hint={t("business.imageHint")}>
          <input id="b-cover" type="url" placeholder="https://" value={f.coverImageUrl} onChange={set("coverImageUrl")} className="input" dir="ltr" />
        </Field>
        <SaveRow pending={m.isPending} success={m.isSuccess} error={m.isError ? errorText(m.error, t("common.somethingWrong")) : ""} label={t("business.save")} />
      </form>
    </Section>
  );
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}

// ─── Location ───────────────────────────────────────────────────────────────

function LocationSection({ data }: { data: EditorData }) {
  const { t } = usePrefs();
  const label = t.maybe(`register.postalLabels.${data.country}`, "postal code");
  const [loc, setLoc] = useState(data.location);
  const [postcode, setPostcode] = useState("");
  const m = useMutation({
    mutationFn: () => api<{ location: { city: string; postcode: string } }>("/api/trader/location", { method: "PUT", json: { postcode } }),
    onSuccess: (r) => { setLoc(r.location); setPostcode(""); },
  });
  const error = m.error instanceof ClientApiError
    ? m.error.code === "postcode_not_found" ? t("register.notFound", { label })
      : m.error.code === "geo_unavailable" ? t("register.lookupDown", { label })
      : t.maybe(`register.postalHints.${data.country}`, t("common.somethingWrong"))
    : m.error ? t("common.somethingWrong") : "";
  return (
    <Section title={t("business.location")} hint={t("business.locationCurrent", { place: `${loc.city}, ${loc.postcode}` })}>
      <form onSubmit={(e) => { e.preventDefault(); if (postcode.trim()) m.mutate(); }} className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor="b-postcode" className="label first-letter:uppercase">{label}</label>
          <input id="b-postcode" value={postcode} onChange={(e) => { setPostcode(e.target.value); m.reset(); }} className="input uppercase" dir="ltr" maxLength={10} />
        </div>
        <button className="btn-ghost" disabled={m.isPending || !postcode.trim()}>{t("business.updateLocation")}</button>
      </form>
      {m.isSuccess && <p role="status" className="text-sm text-brand-700">✓ {t("business.saved")}</p>}
      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
    </Section>
  );
}

// ─── Opening hours ──────────────────────────────────────────────────────────

function HoursSection({ data }: { data: EditorData }) {
  const { t } = usePrefs();
  const [hours, setHours] = useState(() =>
    Object.fromEntries(DAYS.map((d) => {
      const slot = data.hours[d]?.[0];
      return [d, { open: !!slot, from: slot?.open ?? "08:00", to: slot?.close ?? "17:00" }];
    })) as Record<Day, { open: boolean; from: string; to: string }>,
  );
  const m = useMutation({
    mutationFn: () =>
      api("/api/trader/me", {
        method: "PATCH",
        json: { operatingHours: Object.fromEntries(DAYS.map((d) => [d, hours[d].open ? [{ open: hours[d].from, close: hours[d].to }] : []])) },
      }),
  });
  const update = (d: Day, patch: Partial<(typeof hours)[Day]>) => { setHours((h) => ({ ...h, [d]: { ...h[d], ...patch } })); m.reset(); };
  return (
    <Section title={t("business.hours")}>
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="space-y-3">
        <ul className="space-y-2">
          {DAYS.map((d) => (
            <li key={d} className="flex flex-wrap items-center gap-3 text-sm">
              <span className="w-28 font-medium">{t(`profile.days.${d}`)}</span>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={hours[d].open} onChange={(e) => update(d, { open: e.target.checked })} />
                {hours[d].open ? t("business.open") : t("business.closed")}
              </label>
              {hours[d].open && (
                <span className="flex items-center gap-1.5" dir="ltr">
                  <input type="time" aria-label={`${t(`profile.days.${d}`)} ${t("business.opens")}`} value={hours[d].from} onChange={(e) => update(d, { from: e.target.value })} className="input w-28 py-1" required />
                  –
                  <input type="time" aria-label={`${t(`profile.days.${d}`)} ${t("business.closes")}`} value={hours[d].to} onChange={(e) => update(d, { to: e.target.value })} className="input w-28 py-1" required />
                </span>
              )}
            </li>
          ))}
        </ul>
        <SaveRow pending={m.isPending} success={m.isSuccess} error={m.isError ? t("common.somethingWrong") : ""} label={t("business.save")} />
      </form>
    </Section>
  );
}

// ─── Trades (categories) ────────────────────────────────────────────────────

function TradesSection({ data }: { data: EditorData }) {
  const { t } = usePrefs();
  const router = useRouter();
  const [selected, setSelected] = useState(() => new Set(data.trades.map((x) => x.categoryId)));
  const [primary, setPrimary] = useState(data.trades.find((x) => x.isPrimary)?.categoryId ?? data.trades[0]?.categoryId ?? "");
  const m = useMutation({
    mutationFn: () => api("/api/trader/categories", { method: "PUT", json: { categoryIds: [...selected], primaryId: primary } }),
    onSuccess: () => router.refresh(),
  });
  const toggle = (id: string, on: boolean) => {
    m.reset();
    const next = new Set(selected);
    if (on) next.add(id);
    else next.delete(id);
    setSelected(next);
    // Keep a valid primary trade: the first remaining one if the primary was unticked.
    if (!next.has(primary)) setPrimary([...next][0] ?? "");
  };
  return (
    <Section title={t("business.trades")} hint={t("business.tradesHint")}>
      <form onSubmit={(e) => { e.preventDefault(); if (selected.size && primary) m.mutate(); }} className="space-y-3">
        <ul className="grid gap-2 sm:grid-cols-2">
          {data.categories.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 rounded-md border border-ink-200 px-3 py-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={selected.has(c.id)} onChange={(e) => toggle(c.id, e.target.checked)} />
                {t.maybe(`categories.names.${c.slug}`, c.name)}
              </label>
              {selected.has(c.id) && (
                <label className="flex items-center gap-1 text-xs text-ink-500">
                  <input type="radio" name="primary" checked={primary === c.id} onChange={() => { setPrimary(c.id); m.reset(); }} />
                  {t("business.primary")}
                </label>
              )}
            </li>
          ))}
        </ul>
        <SaveRow pending={m.isPending || selected.size === 0} success={m.isSuccess} error={m.isError ? errorText(m.error, t("common.somethingWrong")) : ""} label={t("business.save")} />
      </form>
    </Section>
  );
}

// ─── Services ───────────────────────────────────────────────────────────────

type Draft = { title: string; categoryId: string; description: string; price: string; priceUnit: Unit | "" };
const emptyDraft = (categoryId: string): Draft => ({ title: "", categoryId, description: "", price: "", priceUnit: "job" });
const toPayload = (d: Draft) => ({
  title: d.title, categoryId: d.categoryId, description: d.description.trim() || null, priceFromPence: toMinor(d.price), priceUnit: d.priceUnit || null,
});

function ServicesSection({ data }: { data: EditorData }) {
  const { t, locale } = usePrefs();
  const [services, setServices] = useState(data.services);
  const [editing, setEditing] = useState<string | null>(null);
  // Only the business's own trades can be used for a service.
  const tradeOptions = useMemo(
    () => data.categories.filter((c) => data.trades.some((x) => x.categoryId === c.id)),
    [data.categories, data.trades],
  );
  const label = (id: string) => {
    const c = data.categories.find((x) => x.id === id);
    return c ? t.maybe(`categories.names.${c.slug}`, c.name) : "";
  };

  const add = useMutation({
    mutationFn: (d: Draft) => api<{ service: Service }>("/api/trader/services", { method: "POST", json: toPayload(d) }),
    onSuccess: ({ service }) => setServices((s) => [...s, { ...service, description: service.description ?? "" }]),
  });
  const save = useMutation({
    mutationFn: ({ id, d }: { id: string; d: Draft }) => api<{ service: Service }>(`/api/trader/services/${id}`, { method: "PATCH", json: toPayload(d) }),
    onSuccess: ({ service }) => { setServices((s) => s.map((x) => (x.id === service.id ? { ...service, description: service.description ?? "" } : x))); setEditing(null); },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/trader/services/${id}`, { method: "DELETE" }),
    onSuccess: (_r, id) => setServices((s) => s.filter((x) => x.id !== id)),
  });

  return (
    <Section title={t("business.services")} hint={t("business.servicesHint")}>
      {services.length === 0 && <p className="text-sm text-ink-500">{t("business.noServices")}</p>}
      <ul className="divide-y divide-ink-200">
        {services.map((s) => (
          <li key={s.id} className="py-3">
            {editing === s.id ? (
              <ServiceForm
                initial={{ title: s.title, categoryId: s.categoryId, description: s.description, price: toMajor(s.priceFromPence), priceUnit: (s.priceUnit as Unit) ?? "" }}
                trades={tradeOptions}
                currency={data.currency}
                pending={save.isPending}
                error={save.isError ? errorText(save.error, t("common.somethingWrong")) : ""}
                submitLabel={t("business.save")}
                onSubmit={(d) => save.mutate({ id: s.id, d })}
                onCancel={() => { setEditing(null); save.reset(); }}
              />
            ) : (
              <div className="flex flex-wrap items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{s.title}</p>
                  <p className="text-xs text-ink-500">
                    {label(s.categoryId)}
                    {s.priceFromPence != null && (
                      <> · {t("profile.from", { price: formatMoney(s.priceFromPence, data.currency, locale) ?? "" })}{s.priceUnit && ` / ${t.maybe(`business.units.${s.priceUnit}`, s.priceUnit)}`}</>
                    )}
                  </p>
                  {s.description && <p className="mt-1 text-ink-700">{s.description}</p>}
                </div>
                <div className="flex shrink-0 gap-3 text-xs">
                  <button type="button" className="underline" onClick={() => setEditing(s.id)}>{t("business.edit")}</button>
                  <button type="button" className="text-rose-700 underline" disabled={remove.isPending}
                    onClick={() => window.confirm(t("business.confirmRemove")) && remove.mutate(s.id)}>
                    {t("business.remove")}
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      {remove.isError && <p role="alert" className="text-sm text-rose-600">{t("common.somethingWrong")}</p>}
      <div className="rounded-md bg-ink-100 p-4">
        <h3 className="mb-3 text-sm font-semibold">{t("business.addService")}</h3>
        <ServiceForm
          key={services.length /* reset after each add */}
          initial={emptyDraft(tradeOptions[0]?.id ?? "")}
          trades={tradeOptions}
          currency={data.currency}
          pending={add.isPending}
          error={add.isError ? errorText(add.error, t("common.somethingWrong")) : ""}
          submitLabel={t("business.add")}
          onSubmit={(d) => add.mutate(d)}
        />
      </div>
    </Section>
  );
}

function ServiceForm(props: {
  initial: Draft;
  trades: { id: string; slug: string; name: string }[];
  currency: string;
  pending: boolean;
  error: string;
  submitLabel: string;
  onSubmit: (d: Draft) => void;
  onCancel?: () => void;
}) {
  const { t } = usePrefs();
  const [d, setD] = useState(props.initial);
  const set = <K extends keyof Draft>(k: K) => (e: { target: { value: string } }) => setD((v) => ({ ...v, [k]: e.target.value as Draft[K] }));
  const id = props.onCancel ? "svc-edit" : "svc-new";
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (d.title.trim().length >= 2 && d.categoryId) props.onSubmit(d); }} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={`${id}-title`} label={t("business.serviceTitle")}><input id={`${id}-title`} required minLength={2} maxLength={120} value={d.title} onChange={set("title")} className="input" /></Field>
        <Field id={`${id}-trade`} label={t("business.serviceTrade")}>
          <select id={`${id}-trade`} required value={d.categoryId} onChange={set("categoryId")} className="input">
            {props.trades.map((c) => <option key={c.id} value={c.id}>{t.maybe(`categories.names.${c.slug}`, c.name)}</option>)}
          </select>
        </Field>
        <Field id={`${id}-price`} label={t("business.priceFrom", { currency: props.currency })}>
          <input id={`${id}-price`} type="number" min={0} step="1" value={d.price} onChange={set("price")} className="input" />
        </Field>
        <Field id={`${id}-unit`} label={t("business.unit")}>
          <select id={`${id}-unit`} value={d.priceUnit} onChange={set("priceUnit")} className="input">
            {UNITS.map((u) => <option key={u} value={u}>{t(`business.units.${u}`)}</option>)}
          </select>
        </Field>
      </div>
      <Field id={`${id}-desc`} label={t("business.serviceDescription")}><textarea id={`${id}-desc`} rows={2} maxLength={1000} value={d.description} onChange={set("description")} className="input" /></Field>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={props.pending || !d.categoryId}>{props.submitLabel}</button>
        {props.onCancel && <button type="button" className="btn-ghost" onClick={props.onCancel}>{t("business.cancel")}</button>}
        {props.error && <span role="alert" className="text-sm text-rose-600">{props.error}</span>}
      </div>
    </form>
  );
}

// ─── Extra service areas ────────────────────────────────────────────────────

function AreasSection({ data }: { data: EditorData }) {
  const { t } = usePrefs();
  const [areas, setAreas] = useState(data.areas);
  const [draft, setDraft] = useState("");
  const m = useMutation({
    mutationFn: (next: string[]) => api<{ postcodes: string[] }>("/api/trader/service-areas", { method: "PUT", json: { postcodes: next } }),
    onSuccess: (r) => { setAreas(r.postcodes); setDraft(""); },
  });
  return (
    <Section title={t("business.areas")} hint={t("business.areasHint", { example: data.areaExample })}>
      <ul className="flex flex-wrap gap-2">
        {areas.map((a) => (
          <li key={a} className="flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-700" dir="ltr">
            {a}
            <button type="button" aria-label={`${t("business.remove")} ${a}`} className="ms-1 text-brand-700 hover:text-rose-700"
              disabled={m.isPending} onClick={() => m.mutate(areas.filter((x) => x !== a))}>×</button>
          </li>
        ))}
      </ul>
      <form onSubmit={(e) => { e.preventDefault(); if (draft.trim()) m.mutate([...areas, ...draft.split(/[\s,]+/).filter(Boolean)]); }} className="flex gap-2">
        <input aria-label={t("business.areas")} value={draft} onChange={(e) => { setDraft(e.target.value); m.reset(); }} placeholder={data.areaExample} className="input uppercase" dir="ltr" />
        <button className="btn-ghost" disabled={m.isPending || !draft.trim()}>{t("business.add")}</button>
      </form>
      {m.isError && <p role="alert" className="text-sm text-rose-600">{errorText(m.error, t("common.somethingWrong"))}</p>}
    </Section>
  );
}

// ─── Gallery ────────────────────────────────────────────────────────────────

function GallerySection({ data }: { data: EditorData }) {
  const { t } = usePrefs();
  const [items, setItems] = useState(data.gallery);
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const m = useMutation({
    mutationFn: (next: { url: string; caption: string }[]) =>
      // The server answers with its own copies of linked photos.
      api<{ gallery: { url: string; caption: string | null }[] }>("/api/trader/me", { method: "PATCH", json: { gallery: next.map((g) => ({ url: g.url, caption: g.caption || undefined })) } })
        .then((r) => r.gallery.map((g) => ({ url: g.url, caption: g.caption ?? "" }))),
    onSuccess: (next) => { setItems(next); setUrl(""); setCaption(""); },
  });
  return (
    <Section title={t("business.gallery")} hint={t("business.galleryHint")}>
      {items.length > 0 && (
        <ul className="grid grid-cols-3 gap-2">
          {items.map((g, i) => (
            <li key={`${g.url}-${i}`} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- our own stored copy (/api/media/…) */}
              <img src={g.url} alt={g.caption} className="aspect-square w-full rounded-md bg-ink-200 object-cover" />
              <button type="button" className="absolute end-1 top-1 rounded-full bg-white/90 px-2 text-xs text-rose-700 shadow"
                aria-label={`${t("business.remove")} ${g.caption || i + 1}`} disabled={m.isPending}
                onClick={() => m.mutate(items.filter((_, j) => j !== i))}>×</button>
            </li>
          ))}
        </ul>
      )}
      {items.length < 30 && (
        <form onSubmit={(e) => { e.preventDefault(); if (url.trim()) m.mutate([...items, { url: url.trim(), caption: caption.trim() }]); }} className="grid gap-2 sm:grid-cols-[2fr_1fr_auto]">
          <input type="url" required aria-label={t("business.photoUrl")} placeholder="https://" value={url} onChange={(e) => { setUrl(e.target.value); m.reset(); }} className="input" dir="ltr" />
          <input aria-label={t("business.caption")} placeholder={t("business.caption")} maxLength={140} value={caption} onChange={(e) => setCaption(e.target.value)} className="input" />
          <button className="btn-ghost" disabled={m.isPending}>{t("business.add")}</button>
        </form>
      )}
      {m.isError && <p role="alert" className="text-sm text-rose-600">{errorText(m.error, t("common.somethingWrong"))}</p>}
    </Section>
  );
}
