import { Icon } from "@/components/ui/Icon";
import { SectionHeading } from "@/components/ui/SectionHeading";

const STEPS = [
  { icon: "bulb", tint: "bg-sky-600", title: "Choose What To Do", body: "Tell us the job — from a leaking tap to a full rewire — and where you are." },
  { icon: "compass", tint: "bg-accent-500", title: "Find What You Want", body: "Compare local pros by rate, distance, credentials and verified reviews." },
  { icon: "mountain", tint: "bg-teal-500", title: "Explore & Connect", body: "Call or request a quote directly. You agree the work with the pro." },
];

export function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="py-14">
      <div id="how-heading"><SectionHeading title="How It Works" /></div>
      <ol className="grid gap-10 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex flex-col items-center text-center">
            <span className={`relative grid h-20 w-20 place-items-center rounded-full text-white shadow-lg ${s.tint}`}>
              <Icon name={s.icon} className="h-9 w-9" />
              <span className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-white text-xs font-bold text-ink-900 shadow">{i + 1}</span>
            </span>
            <h3 className="mt-5 font-semibold text-ink-900">{s.title}</h3>
            <p className="mt-2 max-w-xs text-sm text-ink-500">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
