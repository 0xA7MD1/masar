"use client";

import { Card, CardTitle, EmptyState, PageHeader } from "@/components/page-header";
import { QuickAddButton } from "@/components/quick-add/quick-add-button";
import { FunnelBars, SourceResponseChart, WeeklyChart } from "@/components/stats/charts";
import { useApplications, useHistory } from "@/hooks/use-masar-data";
import { applicationsPhrase } from "@/lib/arabic";
import { todayISO } from "@/lib/dates";
import {
  activityByDay,
  averageDaysToFirstResponse,
  computeFunnel,
  computeStreaks,
  cvQuality,
  groupHistory,
  jobTypeSplit,
  percent,
  responseRateBySource,
  weeklySeries,
} from "@/lib/metrics";
import { cn } from "@/lib/utils";

const dayUnit = (n: number) => (Number.isInteger(n) && n >= 3 && n <= 10 ? "أيام" : "يوم");

const SPLIT_COLORS: Record<string, string> = { tech: "#0E968A", non_tech: "#C9822B", unknown: "#E5DED1" };

function StatTile({ label, value, suffix, note }: { label: string; value: string | number; suffix?: string; note: string }) {
  return (
    <Card className="flex flex-col justify-between">
      <h2 className="text-sm font-medium text-ink-muted">{label}</h2>
      {/* "56%" reads naturally LTR; Arabic units ("3 أيام") stay RTL. */}
      <p dir={suffix === "%" ? "ltr" : undefined} className={cn("mt-3 flex items-baseline gap-1", suffix === "%" && "justify-end")}>
        <span className="display text-5xl">{value}</span>
        {suffix ? <span className="text-lg font-semibold text-ink-subtle">{suffix}</span> : null}
      </p>
      <p className="mt-2 text-xs text-ink-subtle">{note}</p>
    </Card>
  );
}

/** The accessible twin of every chart: the same numbers as a small table. */
function DataTable({ caption, headers, rows }: { caption: string; headers: string[]; rows: Array<Array<string | number>> }) {
  return (
    <details className="group mt-4 rounded-xl border border-line px-4 py-2 text-sm">
      <summary className="cursor-pointer text-xs text-ink-muted select-none hover:text-ink">عرض الأرقام كجدول</summary>
      <table className="mt-3 mb-2 w-full text-start">
        <caption className="sr-only">{caption}</caption>
        <thead className="text-xs text-ink-subtle">
          <tr>
            {headers.map((h) => (
              <th key={h} scope="col" className="pb-2 text-start font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line tabular-nums">
          {rows.map((row) => (
            <tr key={String(row[0])}>
              {row.map((cell, i) => (
                <td key={i} className="py-1.5">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

export function StatsView() {
  const today = todayISO();
  const apps = useApplications();
  const history = useHistory();
  const historyMap = groupHistory(history);
  const funnel = computeFunnel(apps, historyMap);

  if (funnel.submitted === 0) {
    return (
      <>
        <PageHeader title="أرقامك" highlight="بوضوح" />
        <Card>
          <EmptyState
            emoji="📊"
            title="الإحصائيات تبدأ مع أول طلب"
            description="ما فيه طلبات للحين — ابدأ بأول طلب اليوم 🚀"
            action={<QuickAddButton>أضف أول طلب</QuickAddButton>}
          />
        </Card>
      </>
    );
  }

  const weeks = weeklySeries(apps, today, 12);
  const sources = responseRateBySource(apps, historyMap);
  const split = jobTypeSplit(apps);
  const splitTotal = split.reduce((sum, s) => sum + s.value, 0);
  const avgDays = averageDaysToFirstResponse(apps, historyMap);
  const quality = cvQuality(apps);
  const streaks = computeStreaks(activityByDay(apps, today), today);
  const funnelStages = [
    { label: "قدّمت", value: funnel.submitted },
    { label: "تم التواصل", value: funnel.contacted },
    { label: "مقابلة", value: funnel.interviews },
    { label: "عرض وظيفي", value: funnel.offers },
  ].map((stage) => ({ ...stage, percent: percent(stage.value, funnel.submitted) }));

  return (
    <>
      <PageHeader
        title="أرقامك"
        highlight="بوضوح"
        description="شوف وين تجيك الردود، ووين يوقف الطلب عادةً — وعدّل خطتك على هالأساس."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="نسبة الرد"
          value={funnel.responseRate}
          suffix="%"
          note={`${funnel.responded} من ${applicationsPhrase(funnel.submitted)} وصلك فيها رد`}
        />
        <StatTile
          label="متوسط أيام أول رد"
          value={avgDays ?? "—"}
          suffix={avgDays === null ? undefined : dayUnit(avgDays)}
          note={avgDays === null ? "ما وصلك رد للحين" : "من التقديم لين أول تواصل أو رفض"}
        />
        <StatTile label="جودة التقديم" value={quality.percent} suffix="%" note="طلبات بسيرة ذاتية معدّلة" />
        <StatTile label="أطول سلسلة" value={streaks.best} suffix={dayUnit(streaks.best)} note={`السلسلة الحالية: ${streaks.current}`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3" aria-labelledby="weekly-title">
          <CardTitle id="weekly-title" action={<span className="text-xs text-ink-subtle">آخر 12 أسبوع</span>}>
            الطلبات كل أسبوع
          </CardTitle>
          <WeeklyChart data={weeks} />
          <DataTable
            caption="عدد الطلبات في كل أسبوع"
            headers={["الأسبوع", "الطلبات"]}
            rows={[...weeks].reverse().map((w) => [w.current ? `${w.label} (هذا الأسبوع)` : w.label, w.count])}
          />
        </Card>

        <Card className="lg:col-span-2" aria-labelledby="funnel-title">
          <CardTitle id="funnel-title">قمع التوظيف</CardTitle>
          <FunnelBars data={funnelStages} />
          <DataTable
            caption="عدد الطلبات اللي وصلت كل مرحلة"
            headers={["المرحلة", "العدد", "النسبة"]}
            rows={funnelStages.map((s) => [s.label, s.value, `${s.percent}%`])}
          />
        </Card>

        <Card className="lg:col-span-3" aria-labelledby="sources-title">
          <CardTitle id="sources-title">نسبة الرد حسب المصدر</CardTitle>
          <SourceResponseChart data={sources} />
          <DataTable
            caption="نسبة الرد لكل مصدر"
            headers={["المصدر", "الطلبات", "ردّوا", "النسبة"]}
            rows={sources.map((s) => [s.label, s.total, s.responded, `${s.rate}%`])}
          />
        </Card>

        <Card className="lg:col-span-2" aria-labelledby="split-title">
          <CardTitle id="split-title">تقنية أو غير تقنية</CardTitle>
          <div className="flex h-4 w-full gap-[2px] overflow-hidden rounded-full" role="img" aria-label={split.map((s) => `${s.label}: ${s.value}`).join("، ")}>
            {split.map((s) => (
              <div key={s.key} style={{ width: `${(s.value / splitTotal) * 100}%`, background: SPLIT_COLORS[s.key] }} />
            ))}
          </div>
          <ul className="mt-5 space-y-3">
            {split.map((s) => (
              <li key={s.key} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ background: SPLIT_COLORS[s.key] }} aria-hidden="true" />
                  {s.label}
                </span>
                <span className="text-ink-muted">
                  <span className="font-bold text-ink">{s.value}</span> · {percent(s.value, splitTotal)}%
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-5 rounded-xl bg-cream/70 px-4 py-3 text-xs leading-relaxed text-ink-muted">
            حدّد نوع الوظيفة من «تفاصيل إضافية» عشان تكون القسمة أدق.
          </p>
        </Card>
      </div>
    </>
  );
}
