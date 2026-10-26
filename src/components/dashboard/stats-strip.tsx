import { cn } from "@/lib/utils";

export type StripItem = { label: string; value: string | number; suffix?: string; note?: string };

/** The dark ink band that carries the headline KPIs. */
export function StatsStrip({ items, className }: { items: StripItem[]; className?: string }) {
  return (
    <section
      aria-label="ملخص الأرقام"
      className={cn(
        "relative overflow-hidden rounded-[22px] bg-ink px-6 py-7 text-cream shadow-[0_18px_48px_rgba(17,17,15,0.22)] md:px-10 md:py-9",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -start-24 size-64 rounded-full bg-brand/25 blur-3xl"
      />
      <dl className="relative grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4 md:gap-0">
        {items.map((item, i) => (
          <div key={item.label} className={cn(i > 0 && "md:border-s md:border-cream/10 md:ps-8")}>
            <dt className="text-sm text-cream/60">{item.label}</dt>
            <dd className="mt-2">
              <span dir="ltr" className="inline-flex items-baseline gap-0.5">
                <span className="display text-5xl md:text-6xl">{item.value}</span>
                {item.suffix ? <span className="text-2xl font-semibold text-brand-light">{item.suffix}</span> : null}
              </span>
              {item.note ? <span className="mt-2 block text-xs text-cream/45">{item.note}</span> : null}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
