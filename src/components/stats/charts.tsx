"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { applicationsPhrase } from "@/lib/arabic";

// Validated with the dataviz palette checker against the paper surface (#FFFDF7):
// single-series brand, and a one-hue ordinal ramp for the funnel stages.
export const CHART_BRAND = "#0E968A";
export const CHART_BRAND_DEEP = "#00443C";
export const FUNNEL_RAMP = ["#5DB5AA", "#2E968C", "#156C63", "#00443C"];
const GRID = "#EAE5DA";
const AXIS_TEXT = "#827B6F";

type LabelBox = { x: number; y: number; width: number; height: number };

/** Recharts hands labels a viewBox whose width is negative on reversed axes; normalise it. */
function labelBox(props: unknown): LabelBox | null {
  const vb = (props as { viewBox?: Partial<LabelBox> }).viewBox;
  if (!vb || vb.x === undefined || vb.y === undefined) return null;
  const width = vb.width ?? 0;
  const height = vb.height ?? 0;
  return {
    x: Math.min(vb.x, vb.x + width),
    y: Math.min(vb.y, vb.y + height),
    width: Math.abs(width),
    height: Math.abs(height),
  };
}

/** Value written just past the bar's free end (the left side, since bars grow leftwards). */
function EndLabel({ props, text }: { props: unknown; text: string }) {
  const box = labelBox(props);
  if (!box) return null;
  return (
    <text x={box.x - 8} y={box.y + box.height / 2} dy={4} textAnchor="end" fill="#11110F" fontSize={12} fontWeight={600}>
      {text}
    </text>
  );
}

function ChartTooltip({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div dir="rtl" className="rounded-xl border border-line bg-paper px-3 py-2 text-xs shadow-lift">
      <p className="font-bold text-ink">{title}</p>
      {lines.map((line) => (
        <p key={line} className="mt-0.5 text-ink-muted">
          {line}
        </p>
      ))}
    </div>
  );
}

type WeekPoint = { weekStart: string; label: string; count: number; current: boolean; currentCount?: number };

/** Applications per week. Rendered LTR with a reversed axis so time flows right→left. */
export function WeeklyChart({ data: points }: { data: WeekPoint[] }) {
  const data = points.map((p) => ({ ...p, currentCount: p.current ? p.count : undefined }));
  return (
    <div dir="ltr" className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 20, right: 4, bottom: 0, left: 4 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis
            dataKey="label"
            reversed
            tickLine={false}
            axisLine={{ stroke: GRID }}
            tick={{ fill: AXIS_TEXT, fontSize: 11 }}
            interval="preserveStartEnd"
            minTickGap={12}
          />
          <YAxis
            orientation="right"
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            width={28}
            tick={{ fill: AXIS_TEXT, fontSize: 11 }}
          />
          <Tooltip
            cursor={{ fill: "rgba(17,17,15,0.04)" }}
            content={({ active, payload }) => {
              const point = active ? (payload?.[0]?.payload as WeekPoint | undefined) : undefined;
              if (!point) return null;
              return (
                <ChartTooltip
                  title={point.current ? "هذا الأسبوع" : `أسبوع ${point.label}`}
                  lines={[applicationsPhrase(point.count)]}
                />
              );
            }}
          />
          <Bar dataKey="count" maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.map((point) => (
              <Cell key={point.weekStart} fill={point.current ? CHART_BRAND_DEEP : CHART_BRAND} />
            ))}
            {/* Only the current week gets a direct label; the axis, tooltip and table carry the rest. */}
            <LabelList dataKey="currentCount" position="top" offset={6} fill="#11110F" fontSize={11} fontWeight={600} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

type SourceRow = { source: string; label: string; total: number; responded: number; rate: number };

/** Response rate per source as horizontal bars growing from the right. */
export function SourceResponseChart({ data }: { data: SourceRow[] }) {
  const height = Math.max(160, data.length * 44 + 24);
  return (
    <div dir="ltr" className="w-full" style={{ height }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 48 }}>
          <CartesianGrid horizontal={false} stroke={GRID} />
          <XAxis type="number" domain={[0, 100]} reversed hide />
          <YAxis
            type="category"
            dataKey="label"
            orientation="right"
            tickLine={false}
            axisLine={false}
            width={104}
            tick={{ fill: "#625D54", fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: "rgba(17,17,15,0.04)" }}
            content={({ active, payload }) => {
              const row = active ? (payload?.[0]?.payload as SourceRow | undefined) : undefined;
              if (!row) return null;
              return (
                <ChartTooltip
                  title={row.label}
                  lines={[`نسبة الرد ${row.rate}%`, `ردّوا على ${row.responded} من ${applicationsPhrase(row.total)}`]}
                />
              );
            }}
          />
          <Bar dataKey="rate" fill={CHART_BRAND} maxBarSize={20} radius={[4, 0, 0, 4]} isAnimationActive={false}>
            <LabelList
              dataKey="rate"
              content={(props) => <EndLabel props={props} text={`${(props as { value?: number }).value ?? 0}%`} />}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

type FunnelStage = { label: string; value: number; percent: number };

/** Ordered stages (applied → offer), so a one-hue ramp light→dark. */
export function FunnelBars({ data }: { data: FunnelStage[] }) {
  return (
    <div dir="ltr" className="h-56 w-full">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 4, bottom: 4, left: 72 }}>
          <XAxis type="number" reversed hide domain={[0, "dataMax"]} />
          <YAxis
            type="category"
            dataKey="label"
            orientation="right"
            tickLine={false}
            axisLine={false}
            width={88}
            tick={{ fill: "#625D54", fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: "rgba(17,17,15,0.04)" }}
            content={({ active, payload }) => {
              const stage = active ? (payload?.[0]?.payload as FunnelStage | undefined) : undefined;
              if (!stage) return null;
              return (
                <ChartTooltip
                  title={stage.label}
                  lines={[applicationsPhrase(stage.value), `${stage.percent}% من اللي قدّمت عليها`]}
                />
              );
            }}
          />
          <Bar dataKey="value" maxBarSize={28} radius={[4, 0, 0, 4]} isAnimationActive={false} minPointSize={2}>
            {data.map((stage, i) => (
              <Cell key={stage.label} fill={FUNNEL_RAMP[i % FUNNEL_RAMP.length]} />
            ))}
            <LabelList
              dataKey="value"
              content={(props) => {
                const stage = data[(props as { index?: number }).index ?? -1];
                return stage ? <EndLabel props={props} text={`${stage.value} · ${stage.percent}%`} /> : null;
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
