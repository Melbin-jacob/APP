/** Dependency-free daily bar chart for the ops overview. */
export function MiniBars({ title, points, unit = "total" }: { title: string; points: { day: string; count: number }[]; unit?: string }) {
  const max = Math.max(1, ...points.map((p) => p.count));
  const total = points.reduce((s, p) => s + p.count, 0);
  return (
    <section className="card p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="text-xs text-ink-500">{total.toLocaleString("en")} {unit}</span>
      </div>
      <div className="flex h-24 items-end gap-[2px]" role="img" aria-label={`${title}: ${total} ${unit}`}>
        {points.map((p) => (
          <div key={p.day} title={`${p.day}: ${p.count}`} className="flex-1 rounded-t bg-brand-500/80" style={{ height: `${Math.max(2, (p.count / max) * 100)}%` }} />
        ))}
      </div>
    </section>
  );
}
