/** Centered title with the short green underline used throughout the reference UI. */
export function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-8 text-center">
      <h2 className="text-2xl font-bold text-ink-900 sm:text-3xl">{title}</h2>
      <span className="mx-auto mt-3 block h-1 w-12 rounded-full bg-brand-500" aria-hidden="true" />
      {subtitle && <p className="mx-auto mt-4 max-w-xl text-sm text-ink-500">{subtitle}</p>}
    </div>
  );
}
