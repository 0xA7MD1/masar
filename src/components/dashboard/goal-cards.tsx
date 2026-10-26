import { Flame, Sparkles, Target } from "lucide-react";

import { Card } from "@/components/page-header";
import { applicationsPhrase, countPhrase } from "@/lib/arabic";
import { GOAL_PERIOD_KEYS, type GoalPeriod } from "@/lib/constants";
import { WEEKDAY_INITIALS, WEEKDAYS } from "@/lib/dates";
import { GOAL_META, type Goal, type GoalCounts, type GoalTargets } from "@/lib/goals";
import { cn } from "@/lib/utils";

const timesPhrase = (n: number) => countPhrase(n, { one: "مرة وحدة", two: "مرتين", few: "مرات", many: "مرة" });

function Bar({ value, className }: { value: number; className?: string }) {
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-sand" aria-hidden="true">
      <div
        className={cn("h-full rounded-full transition-[width] duration-700", className)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function CardLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm font-medium text-ink-muted">
      <h2>{children}</h2>
      {icon}
    </div>
  );
}

function GoalRow({
  period,
  count,
  target,
  wins,
  primary,
}: {
  period: GoalPeriod;
  count: number;
  target: number;
  wins: number;
  primary: boolean;
}) {
  const meta = GOAL_META[period];
  const reached = count >= target;
  return (
    <li className="flex items-center gap-3">
      <span
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-2xl text-xl transition",
          reached ? "bg-brand-soft shadow-sm" : "bg-sand/70 grayscale opacity-60",
        )}
        title={reached ? `شارة «${meta.badge}»` : `حقق ${meta.label} وتاخذ شارة «${meta.badge}»`}
      >
        <span aria-hidden="true">{meta.emoji}</span>
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            {meta.label}
            {primary ? (
              <span className="rounded-full bg-cream px-2 py-0.5 text-[11px] font-medium text-ink-muted">هدفك</span>
            ) : null}
          </h3>
          <span dir="ltr" className="text-sm tabular-nums">
            <span className="font-bold text-ink">{count}</span>
            <span className="text-ink-subtle">/{target}</span>
          </span>
        </div>
        <div
          className="mt-1.5"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={target}
          aria-valuenow={Math.min(count, target)}
          aria-label={`التقدّم نحو ${meta.label}`}
        >
          <Bar value={(count / target) * 100} className={reached ? "bg-brand-deep" : "bg-brand"} />
        </div>
        <p className="mt-1 text-xs text-ink-subtle">
          {reached ? <span className="font-semibold text-brand-deep">{meta.badge} ✓ · </span> : null}
          {wins > 0 ? `حققته ${timesPhrase(wins)}` : "ما حققته للحين"}
        </p>
      </div>
    </li>
  );
}

export function GoalsCard({
  goal,
  counts,
  targets,
  wins,
  days,
}: {
  goal: Goal;
  counts: GoalCounts;
  targets: GoalTargets;
  wins: GoalCounts;
  days: Array<{ date: string; count: number; isToday: boolean; isFuture: boolean }>;
}) {
  const leftToday = targets.day - counts.day;
  const leftForGoal = targets[goal.period] - counts[goal.period];
  return (
    <Card aria-labelledby="goals-title">
      <CardLabel icon={<Target className="size-5 text-brand" aria-hidden="true" />}>
        <span id="goals-title">أهدافك</span>
      </CardLabel>
      <ul className="mt-4 space-y-3.5">
        {GOAL_PERIOD_KEYS.map((period) => (
          <GoalRow
            key={period}
            period={period}
            count={counts[period]}
            target={targets[period]}
            wins={wins[period]}
            primary={period === goal.period}
          />
        ))}
      </ul>
      <ul className="mt-5 grid grid-cols-7 gap-1.5" aria-label="طلبات كل يوم هذا الأسبوع">
        {days.map((day, i) => (
          <li key={day.date} className="flex flex-col items-center gap-1.5">
            <span
              className={cn(
                "grid h-8 w-full place-items-center rounded-lg text-xs font-semibold",
                day.count > 0 ? "bg-brand text-paper" : day.isFuture ? "border border-dashed border-line" : "bg-sand/70",
                day.isToday && "ring-2 ring-ink ring-offset-2 ring-offset-paper",
              )}
            >
              {day.count > 0 ? day.count : ""}
            </span>
            <span className={cn("text-[11px] text-ink-subtle", day.isToday && "font-bold text-ink")}>
              <span aria-hidden="true">{WEEKDAY_INITIALS[i]}</span>
              <span className="sr-only">
                {WEEKDAYS[i]}: {applicationsPhrase(day.count)}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-ink-muted">
        {leftForGoal <= 0 ? (
          <span className="font-semibold text-brand-deep">حققت هدفك {GOAL_META[goal.period].emoji} أي طلب زيادة بونص.</span>
        ) : leftToday > 0 ? (
          <>باقي {applicationsPhrase(leftToday)} اليوم وتحقق هدف اليوم.</>
        ) : (
          <>خلصت اليوم ✓ باقي {applicationsPhrase(leftForGoal)} على {GOAL_META[goal.period].label}.</>
        )}
      </p>
    </Card>
  );
}

export function StreakCard({ current, best, activeToday }: { current: number; best: number; activeToday: boolean }) {
  const unit = current >= 3 && current <= 10 ? "أيام متتالية" : "يوم متتالي";
  return (
    <Card aria-labelledby="streak-title" className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -end-16 size-44 rounded-full bg-coral/10 blur-2xl"
      />
      <CardLabel
        icon={
          <Flame
            className={cn("size-5", current > 0 ? "fill-coral text-coral" : "text-ink-subtle")}
            aria-hidden="true"
          />
        }
      >
        <span id="streak-title">السلسلة</span>
      </CardLabel>
      <p className="mt-4 flex items-baseline gap-2">
        <span className={cn("display text-5xl", current > 0 && "text-coral")}>{current}</span>
        <span className="text-sm text-ink-muted">{unit}</span>
      </p>
      <p className="mt-4 text-sm leading-relaxed text-ink-muted">
        {activeToday
          ? "قدّمت اليوم — السلسلة مستمرة 🔥"
          : current > 0
            ? "قدّم طلب اليوم عشان ما تنقطع السلسلة."
            : "قدّم طلب اليوم وابدأ سلسلة جديدة."}
      </p>
      <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-cream px-3 py-1 text-xs text-ink-muted">
        أطول سلسلة: <span className="font-bold text-ink">{best}</span>
      </p>
    </Card>
  );
}

export function QualityCard({ percent, tailored, total }: { percent: number; tailored: number; total: number }) {
  return (
    <Card aria-labelledby="quality-title">
      <CardLabel icon={<Sparkles className="size-5 text-brand" aria-hidden="true" />}>
        <span id="quality-title">جودة التقديم</span>
      </CardLabel>
      <p dir="ltr" className="mt-4 flex items-baseline justify-end gap-0.5">
        <span className="display text-5xl">{percent}</span>
        <span className="text-2xl font-semibold text-ink-subtle">%</span>
      </p>
      <div
        className="mt-4"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label="نسبة الطلبات بسيرة معدّلة"
      >
        <Bar value={percent} className="bg-[linear-gradient(90deg,var(--brand-soft),var(--brand-light))]" />
      </div>
      <p className="mt-4 text-sm leading-relaxed text-ink-muted">
        عدّلت سيرتك في <span className="font-semibold text-ink">{tailored}</span> من{" "}
        <span className="font-semibold text-ink">{applicationsPhrase(total)}</span>.{" "}
        {percent >= 60 ? "ممتاز، الجودة أهم من الكمية." : "جرّب تعدّلها لكل وظيفة — تفرق كثير."}
      </p>
    </Card>
  );
}
