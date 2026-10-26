import { ScrollToEnd } from "@/components/scroll-to-end";
import { applicationsPhrase } from "@/lib/arabic";
import { formatDate, WEEKDAYS } from "@/lib/dates";
import type { HeatmapCell } from "@/lib/metrics";

const LEVEL_COLORS = ["#EAE5DA", "#C5E3DE", "#7FC9BF", "#268F86", "#00443C"];

function level(count: number): number {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  return 4;
}

/**
 * GitHub-style grid: one column per week, Sunday on top. In RTL the oldest week
 * sits on the right and time flows leftwards, matching the reading direction.
 */
export function Heatmap({
  columns,
  months,
  total,
}: {
  columns: HeatmapCell[][];
  months: Array<{ column: number; label: string }>;
  total: number;
}) {
  const monthAt = new Map(months.map((m) => [m.column, m.label]));
  const weekTotals = columns.map((column) => column.reduce((sum, cell) => sum + cell.count, 0));
  const weekdayTotals = WEEKDAYS.map((_, d) => columns.reduce((sum, column) => sum + column[d].count, 0));
  const busiest = weekdayTotals.indexOf(Math.max(...weekdayTotals));
  const insights = [
    { label: "أنشط يوم", value: total > 0 ? WEEKDAYS[busiest] : "—" },
    { label: "أفضل أسبوع", value: applicationsPhrase(Math.max(...weekTotals)) },
    { label: "المعدل الأسبوعي", value: (total / columns.length).toFixed(1) },
  ];

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
      <ScrollToEnd
        className="no-scrollbar -mx-1 overflow-x-auto px-1 pb-1"
        role="img"
        aria-label={`${applicationsPhrase(total)} في آخر 6 أشهر`}
      >
        <div className="inline-flex gap-[3px]" aria-hidden="true">
          <div className="me-1.5 flex flex-col gap-[3px] pt-5 text-[10px] leading-none text-ink-subtle">
            {WEEKDAYS.map((day, i) => (
              <span key={day} className="flex h-3 items-center sm:h-3.5 lg:h-4">
                {i % 2 === 1 ? day.replace("ال", "") : ""}
              </span>
            ))}
          </div>
          {columns.map((column, w) => (
            <div key={column[0].date} className="flex flex-col gap-[3px]">
              <div className="relative h-4">
                {monthAt.has(w) ? (
                  <span className="absolute start-0 top-0 text-[10px] whitespace-nowrap text-ink-subtle">
                    {monthAt.get(w)}
                  </span>
                ) : null}
              </div>
              {column.map((cell) => (
                <span
                  key={cell.date}
                  title={cell.future ? undefined : `${applicationsPhrase(cell.count)} · ${formatDate(cell.date)}`}
                  className="block size-3 rounded-[3px] sm:size-3.5 lg:size-4"
                  style={
                    cell.future
                      ? { background: "transparent", outline: "1px dashed var(--line)", outlineOffset: -1 }
                      : { background: LEVEL_COLORS[level(cell.count)] }
                  }
                />
              ))}
            </div>
          ))}
        </div>
      </ScrollToEnd>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-ink-subtle" aria-hidden="true">
        أقل
        {LEVEL_COLORS.map((color) => (
          <span key={color} className="size-3 rounded-[3px]" style={{ background: color }} />
        ))}
        أكثر
      </div>
      </div>
      <dl className="grid grid-cols-3 gap-3 lg:w-56 lg:grid-cols-1">
        {insights.map((item) => (
          <div key={item.label} className="rounded-2xl bg-cream/70 px-4 py-3">
            <dt className="text-xs text-ink-subtle">{item.label}</dt>
            <dd className="mt-1 font-bold">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
