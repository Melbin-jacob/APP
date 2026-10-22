import { Icon } from "@/components/ui/Icon";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getI18n } from "@/i18n/server";

const STEPS = [
  { icon: "bulb", tint: "bg-sky-600", n: 1 },
  { icon: "compass", tint: "bg-accent-500", n: 2 },
  { icon: "mountain", tint: "bg-teal-500", n: 3 },
] as const;

export async function HowItWorks() {
  const { t } = await getI18n();
  return (
    <section aria-labelledby="how-heading" className="py-14">
      <div id="how-heading"><SectionHeading title={t("how.title")} /></div>
      <ol className="grid gap-10 sm:grid-cols-3">
        {STEPS.map((s) => (
          <li key={s.n} className="flex flex-col items-center text-center">
            <span className={`relative grid h-20 w-20 place-items-center rounded-full text-white shadow-lg ${s.tint}`}>
              <Icon name={s.icon} className="h-9 w-9" />
              <span className="absolute -end-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-white text-xs font-bold text-ink-900 shadow">{s.n}</span>
            </span>
            <h3 className="mt-5 font-semibold text-ink-900">{t(`how.step${s.n}Title`)}</h3>
            <p className="mt-2 max-w-xs text-sm text-ink-500">{t(`how.step${s.n}Body`)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
