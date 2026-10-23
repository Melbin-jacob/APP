"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent, type ReactNode } from "react";
import { api, ClientApiError } from "@/lib/api-client";
import { Badge, PageTitle } from "./ui";

type Incident = {
  id: string; title: string; description: string; detectedAt: string; occurredAt: string | null; status: "OPEN" | "CONTAINED" | "CLOSED";
  personalData: boolean; dataTypes: string | null; affectedCount: number | null; jurisdictions: string | null;
  riskOfSignificantHarm: boolean | null; riskAssessment: string | null; containment: string | null;
  regulatorNotifiedAt: string | null; individualsNotifiedAt: string | null; createdAt: string; updatedAt: string;
};

const toInput = (d: string | null) => (d ? new Date(d).toISOString().slice(0, 16) : "");
const fromInput = (v: string) => (v ? new Date(v).toISOString() : null);
const hoursSince = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 3_600_000);

function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return <label className={`block text-sm ${wide ? "sm:col-span-2" : ""}`}><span className="label">{label}</span>{children}</label>;
}

function Deadlines({ i }: { i: Incident }) {
  if (!i.personalData) return null;
  const h = hoursSince(i.detectedAt);
  const notifyNeeded = i.riskOfSignificantHarm === true;
  return (
    <ul className="mt-2 space-y-1 rounded-md bg-[#f1ece2] p-3 text-xs text-ink-900">
      <li><strong>{h} h</strong> since detection. GDPR (if EU residents are affected): regulator within 72 h{h >= 72 ? " (passed)" : ` (${72 - h} h left)`}.</li>
      {i.riskOfSignificantHarm === null && <li>Assess now whether there is a <strong>real risk of significant harm</strong> (PIPEDA / Quebec Law 25: sensitivity of the data × probability of misuse).</li>}
      {notifyNeeded && !i.regulatorNotifiedAt && <li>Report to the Privacy Commissioner of Canada (and the CAI if Quebec residents) <strong>as soon as feasible</strong>; US state laws: most expedient time.</li>}
      {notifyNeeded && !i.individualsNotifiedAt && <li>Notify affected individuals <strong>as soon as feasible</strong>, with steps they can take to reduce harm.</li>}
      <li>Keep this record for at least 24 months (PIPEDA s.10.3), whether or not it was reported.</li>
    </ul>
  );
}

function IncidentForm({ initial, onSave, saving, error, onCancel }: {
  initial?: Incident; onSave: (body: Record<string, unknown>) => void; saving: boolean; error: string; onCancel?: () => void;
}) {
  const [f, setF] = useState({
    title: initial?.title ?? "", description: initial?.description ?? "",
    detectedAt: toInput(initial?.detectedAt ?? new Date().toISOString()), occurredAt: toInput(initial?.occurredAt ?? null),
    status: initial?.status ?? "OPEN", personalData: initial?.personalData ?? false, dataTypes: initial?.dataTypes ?? "",
    affectedCount: initial?.affectedCount?.toString() ?? "", jurisdictions: initial?.jurisdictions ?? "",
    rrosh: initial?.riskOfSignificantHarm == null ? "" : initial.riskOfSignificantHarm ? "yes" : "no",
    riskAssessment: initial?.riskAssessment ?? "", containment: initial?.containment ?? "",
    regulatorNotifiedAt: toInput(initial?.regulatorNotifiedAt ?? null), individualsNotifiedAt: toInput(initial?.individualsNotifiedAt ?? null),
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((v) => ({ ...v, [k]: e.target.value }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave({
      title: f.title, description: f.description, detectedAt: fromInput(f.detectedAt), occurredAt: fromInput(f.occurredAt),
      status: f.status, personalData: f.personalData, dataTypes: f.dataTypes || null,
      affectedCount: f.affectedCount ? Number(f.affectedCount) : null, jurisdictions: f.jurisdictions || null,
      riskOfSignificantHarm: f.rrosh === "" ? null : f.rrosh === "yes", riskAssessment: f.riskAssessment || null, containment: f.containment || null,
      regulatorNotifiedAt: fromInput(f.regulatorNotifiedAt), individualsNotifiedAt: fromInput(f.individualsNotifiedAt),
    });
  };
  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <Field label="Title" wide><input required minLength={3} maxLength={200} value={f.title} onChange={set("title")} className="input" /></Field>
      <Field label="What happened" wide><textarea required rows={3} value={f.description} onChange={set("description")} className="input" /></Field>
      <Field label="Detected"><input type="datetime-local" required value={f.detectedAt} onChange={set("detectedAt")} className="input" /></Field>
      <Field label="Happened (if known)"><input type="datetime-local" value={f.occurredAt} onChange={set("occurredAt")} className="input" /></Field>
      <Field label="Status">
        <select value={f.status} onChange={set("status")} className="input"><option value="OPEN">Open</option><option value="CONTAINED">Contained</option><option value="CLOSED">Closed</option></select>
      </Field>
      <label className="flex items-center gap-2 self-end pb-2 text-sm">
        <input type="checkbox" checked={f.personalData} onChange={(e) => setF((v) => ({ ...v, personalData: e.target.checked }))} /> Personal information involved
      </label>
      <Field label="Data involved"><input value={f.dataTypes} onChange={set("dataTypes")} placeholder="e.g. names, emails, phone numbers" className="input" /></Field>
      <Field label="People affected (approx.)"><input type="number" min={0} value={f.affectedCount} onChange={set("affectedCount")} className="input" /></Field>
      <Field label="Where they live"><input value={f.jurisdictions} onChange={set("jurisdictions")} placeholder="e.g. CA-ON, CA-QC, US-CA" className="input" /></Field>
      <Field label="Real risk of significant harm?">
        <select value={f.rrosh} onChange={set("rrosh")} className="input"><option value="">Not assessed yet</option><option value="yes">Yes: notification required</option><option value="no">No</option></select>
      </Field>
      <Field label="Risk assessment (why)" wide><textarea rows={2} value={f.riskAssessment} onChange={set("riskAssessment")} className="input" /></Field>
      <Field label="Containment and fixes" wide><textarea rows={2} value={f.containment} onChange={set("containment")} className="input" /></Field>
      <Field label="Regulator notified"><input type="datetime-local" value={f.regulatorNotifiedAt} onChange={set("regulatorNotifiedAt")} className="input" /></Field>
      <Field label="Individuals notified"><input type="datetime-local" value={f.individualsNotifiedAt} onChange={set("individualsNotifiedAt")} className="input" /></Field>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button className="btn-primary" disabled={saving}>{initial ? "Save" : "Record incident"}</button>
        {onCancel && <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>}
        {error && <span role="alert" className="text-sm text-rose-600">{error}</span>}
      </div>
    </form>
  );
}

export function AdminIncidentsClient() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["incidents"], queryFn: () => api<{ incidents: Incident[] }>("/api/admin/incidents") });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const done = () => { qc.invalidateQueries({ queryKey: ["incidents"] }); setCreating(false); setEditing(null); };
  const create = useMutation({ mutationFn: (b: Record<string, unknown>) => api("/api/admin/incidents", { method: "POST", json: b }), onSuccess: done });
  const update = useMutation({ mutationFn: ({ id, b }: { id: string; b: Record<string, unknown> }) => api(`/api/admin/incidents/${id}`, { method: "PATCH", json: b }), onSuccess: done });
  const err = (e: unknown) => (e instanceof ClientApiError ? e.message : e ? "Something went wrong" : "");

  return (
    <>
      <PageTitle actions={!creating && <button className="btn-primary" onClick={() => setCreating(true)}>Record an incident</button>}>Security incidents &amp; breaches</PageTitle>
      <p className="mb-4 text-sm text-ink-500">
        Record every security incident here, including suspected ones and breaches you decide not to report. The playbook is in
        docs/security/INCIDENT_RESPONSE.md. Records are kept 24+ months as PIPEDA requires.
      </p>
      {creating && <div className="card mb-4 p-5"><IncidentForm onSave={(b) => create.mutate(b)} saving={create.isPending} error={err(create.error)} onCancel={() => setCreating(false)} /></div>}
      <div className="space-y-3">
        {q.data?.incidents.map((i) => (
          <article key={i.id} className="card p-5 text-sm">
            {editing === i.id ? (
              <IncidentForm initial={i} onSave={(b) => update.mutate({ id: i.id, b })} saving={update.isPending} error={err(update.error)} onCancel={() => setEditing(null)} />
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">
                      {i.title}{" "}
                      <Badge tone={i.status === "OPEN" ? "bad" : i.status === "CONTAINED" ? "warn" : "neutral"}>{i.status}</Badge>{" "}
                      {i.personalData && <Badge tone="warn">personal data</Badge>}
                    </h2>
                    <p className="text-xs text-ink-500">Detected {new Date(i.detectedAt).toLocaleString("en-GB")}{i.affectedCount != null && ` · ~${i.affectedCount} people`}{i.jurisdictions && ` · ${i.jurisdictions}`}</p>
                  </div>
                  <button className="btn-ghost px-3 py-1 text-xs" onClick={() => setEditing(i.id)}>Update</button>
                </div>
                <p className="mt-2 whitespace-pre-line text-ink-700">{i.description}</p>
                <p className="mt-2 text-xs text-ink-500">
                  Risk of significant harm: {i.riskOfSignificantHarm == null ? "not assessed" : i.riskOfSignificantHarm ? "yes" : "no"}
                  {" · "}Regulator: {i.regulatorNotifiedAt ? new Date(i.regulatorNotifiedAt).toLocaleDateString("en-GB") : "not notified"}
                  {" · "}Individuals: {i.individualsNotifiedAt ? new Date(i.individualsNotifiedAt).toLocaleDateString("en-GB") : "not notified"}
                </p>
                {i.status !== "CLOSED" && <Deadlines i={i} />}
              </>
            )}
          </article>
        ))}
        {q.data?.incidents.length === 0 && <p className="py-8 text-center text-sm text-ink-500">No incidents recorded.</p>}
      </div>
    </>
  );
}
