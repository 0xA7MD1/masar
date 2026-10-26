// Pure computations over applications + status history. Shared by pages and actions.
import type { Application, StatusChange } from "@/db/schema";

import { applicationsPhrase } from "./arabic";
import {
  CLOSED_STATUSES,
  JOB_TYPE_LABELS,
  SOURCE_KEYS,
  SOURCE_LABELS,
  STALE_AFTER_DAYS,
  type JobType,
  type Source,
  type Status,
} from "./constants";
import { addDays, diffDays, formatShortDate, monthLabel, toISODate, weekStartISO } from "./dates";

type AppLike = Pick<
  Application,
  "id" | "status" | "appliedDate" | "source" | "jobType" | "cvTailored" | "nextFollowUp" | "updatedAt"
>;
type HistoryLike = Pick<StatusChange, "applicationId" | "fromStatus" | "toStatus" | "changedAt">;
export type HistoryMap = Map<number, HistoryLike[]>;

const RESPONSE_STATUSES: readonly Status[] = ["contacted", "interview", "offer", "accepted", "rejected"];
const CONTACTED_OR_LATER: readonly Status[] = ["contacted", "interview", "offer", "accepted"];
const INTERVIEW_OR_LATER: readonly Status[] = ["interview", "offer", "accepted"];
const OFFER_OR_LATER: readonly Status[] = ["offer", "accepted"];

/** "saved" applications are bookmarks, not submissions, so most stats skip them. */
export function isSubmitted(app: Pick<Application, "status">): boolean {
  return app.status !== "saved";
}

export function groupHistory(history: HistoryLike[]): HistoryMap {
  const map: HistoryMap = new Map();
  const sorted = [...history].sort((a, b) => a.changedAt.getTime() - b.changedAt.getTime());
  for (const entry of sorted) {
    const list = map.get(entry.applicationId);
    if (list) list.push(entry);
    else map.set(entry.applicationId, [entry]);
  }
  return map;
}

function statusesReached(app: AppLike, history: HistoryLike[] = []): Set<Status> {
  const reached = new Set<Status>([app.status]);
  for (const entry of history) {
    reached.add(entry.toStatus);
    if (entry.fromStatus) reached.add(entry.fromStatus);
  }
  return reached;
}

const reachedAny = (reached: Set<Status>, group: readonly Status[]) => group.some((s) => reached.has(s));

export type Funnel = {
  submitted: number;
  contacted: number;
  interviews: number;
  offers: number;
  responded: number;
  responseRate: number;
};

export function computeFunnel(apps: AppLike[], historyMap: HistoryMap): Funnel {
  const submitted = apps.filter(isSubmitted);
  const funnel = { submitted: submitted.length, contacted: 0, interviews: 0, offers: 0, responded: 0 };
  for (const app of submitted) {
    const reached = statusesReached(app, historyMap.get(app.id));
    if (reachedAny(reached, CONTACTED_OR_LATER)) funnel.contacted++;
    if (reachedAny(reached, INTERVIEW_OR_LATER)) funnel.interviews++;
    if (reachedAny(reached, OFFER_OR_LATER)) funnel.offers++;
    if (reachedAny(reached, RESPONSE_STATUSES)) funnel.responded++;
  }
  return { ...funnel, responseRate: percent(funnel.responded, funnel.submitted) };
}

export function percent(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

/** Number of submitted applications per applied date, ignoring future dates. */
export function activityByDay(apps: AppLike[], today: string): Map<string, number> {
  const days = new Map<string, number>();
  for (const app of apps) {
    if (!isSubmitted(app) || app.appliedDate > today) continue;
    days.set(app.appliedDate, (days.get(app.appliedDate) ?? 0) + 1);
  }
  return days;
}

/** The current streak survives until the end of today, so it may end yesterday. */
export function computeStreaks(days: Map<string, number>, today: string) {
  const sorted = [...days.keys()].sort();
  let best = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of sorted) {
    run = previous && diffDays(day, previous) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }

  let cursor = days.has(today) ? today : addDays(today, -1);
  let current = 0;
  while (days.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  return { current, best, activeToday: days.has(today) };
}

export function weekDays(days: Map<string, number>, today: string) {
  const start = weekStartISO(today);
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    return { date, count: days.get(date) ?? 0, isToday: date === today, isFuture: date > today };
  });
}

export function weekCount(days: Map<string, number>, today: string): number {
  return weekDays(days, today).reduce((sum, d) => sum + d.count, 0);
}

export type HeatmapCell = { date: string; count: number; future: boolean };

export function heatmap(days: Map<string, number>, today: string, weeks = 26) {
  const start = weekStartISO(addDays(today, -(weeks - 1) * 7));
  const columns: HeatmapCell[][] = [];
  const months: Array<{ column: number; label: string }> = [];
  let max = 0;
  for (let w = 0; w < weeks; w++) {
    const column: HeatmapCell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(start, w * 7 + d);
      const count = days.get(date) ?? 0;
      max = Math.max(max, count);
      column.push({ date, count, future: date > today });
    }
    const firstDay = column[0].date;
    const month = monthLabel(firstDay);
    if (w === 0 || month !== monthLabel(columns[w - 1][0].date)) {
      months.push({ column: w, label: month });
    }
    columns.push(column);
  }
  const total = [...days.entries()].filter(([date]) => date >= start).reduce((s, [, c]) => s + c, 0);
  return { columns, months, max, total };
}

export function weeklySeries(apps: AppLike[], today: string, weeks = 12) {
  const currentWeek = weekStartISO(today);
  const series = Array.from({ length: weeks }, (_, i) => {
    const start = addDays(currentWeek, -(weeks - 1 - i) * 7);
    return { weekStart: start, label: formatShortDate(start), count: 0, current: start === currentWeek };
  });
  const index = new Map(series.map((s, i) => [s.weekStart, i]));
  for (const app of apps) {
    if (!isSubmitted(app)) continue;
    const i = index.get(weekStartISO(app.appliedDate));
    if (i !== undefined) series[i].count++;
  }
  return series;
}

export function responseRateBySource(apps: AppLike[], historyMap: HistoryMap) {
  const rows = new Map<Source, { total: number; responded: number }>();
  for (const app of apps) {
    if (!isSubmitted(app)) continue;
    const row = rows.get(app.source) ?? { total: 0, responded: 0 };
    row.total++;
    if (reachedAny(statusesReached(app, historyMap.get(app.id)), RESPONSE_STATUSES)) row.responded++;
    rows.set(app.source, row);
  }
  return SOURCE_KEYS.filter((s) => rows.has(s))
    .map((source) => {
      const row = rows.get(source)!;
      return { source, label: SOURCE_LABELS[source], ...row, rate: percent(row.responded, row.total) };
    })
    .sort((a, b) => b.rate - a.rate || b.total - a.total);
}

/** Average days between applying and the first status change that counts as a reply. */
export function averageDaysToFirstResponse(apps: AppLike[], historyMap: HistoryMap): number | null {
  const samples: number[] = [];
  for (const app of apps) {
    if (!isSubmitted(app)) continue;
    const first = historyMap.get(app.id)?.find((h) => RESPONSE_STATUSES.includes(h.toStatus));
    if (!first) continue;
    const days = diffDays(toISODate(first.changedAt), app.appliedDate);
    if (days >= 0) samples.push(days);
  }
  if (samples.length === 0) return null;
  return Math.round((samples.reduce((s, d) => s + d, 0) / samples.length) * 10) / 10;
}

export function jobTypeSplit(apps: AppLike[]) {
  const counts = new Map<JobType | "unknown", number>();
  for (const app of apps) {
    if (!isSubmitted(app)) continue;
    const key = app.jobType ?? "unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const order: Array<JobType | "unknown"> = ["tech", "non_tech", "unknown"];
  return order
    .filter((k) => counts.has(k))
    .map((key) => ({
      key,
      label: key === "unknown" ? "غير محدد" : JOB_TYPE_LABELS[key],
      value: counts.get(key)!,
    }));
}

export function cvQuality(apps: AppLike[]) {
  const submitted = apps.filter(isSubmitted);
  const tailored = submitted.filter((a) => a.cvTailored).length;
  return { tailored, total: submitted.length, percent: percent(tailored, submitted.length) };
}

/** Days since the application last changed, counting from its applied date at the earliest. */
export function daysWithoutUpdate(app: AppLike, today: string): number {
  const lastTouch = [app.appliedDate, toISODate(app.updatedAt)].sort().at(-1)!;
  return diffDays(today, lastTouch);
}

export function isStale(app: AppLike, today: string): boolean {
  return app.status === "applied" && daysWithoutUpdate(app, today) >= STALE_AFTER_DAYS;
}

export function dueFollowUps<T extends AppLike>(apps: T[], today: string) {
  return apps
    .filter((a) => a.nextFollowUp && a.nextFollowUp <= today && !CLOSED_STATUSES.includes(a.status))
    .map((app) => ({ app, overdueDays: diffDays(today, app.nextFollowUp!) }))
    .sort((a, b) => b.overdueDays - a.overdueDays);
}

export type BadgeId =
  | "first_application"
  | "ten_applications"
  | "fifty_applications"
  | "first_interview"
  | "first_offer"
  | "streak_7";

export type Badge = { id: BadgeId; label: string; emoji: string; earned: boolean; hint: string };

export function computeBadges(input: { submitted: number; interviews: number; offers: number; bestStreak: number }): Badge[] {
  const remaining = (goal: number) => `باقي ${applicationsPhrase(goal - input.submitted)}`;
  return [
    {
      id: "first_application",
      label: "أول طلب",
      emoji: "🌱",
      earned: input.submitted >= 1,
      hint: "قدّم أول طلب",
    },
    {
      id: "ten_applications",
      label: "10 طلبات",
      emoji: "✍️",
      earned: input.submitted >= 10,
      hint: remaining(10),
    },
    {
      id: "fifty_applications",
      label: "50 طلب",
      emoji: "🏔️",
      earned: input.submitted >= 50,
      hint: remaining(50),
    },
    {
      id: "first_interview",
      label: "أول مقابلة",
      emoji: "🎙️",
      earned: input.interviews >= 1,
      hint: "توصلك مع أول مقابلة",
    },
    {
      id: "first_offer",
      label: "أول عرض",
      emoji: "🎉",
      earned: input.offers >= 1,
      hint: "توصلك مع أول عرض وظيفي",
    },
    {
      id: "streak_7",
      label: "سلسلة 7 أيام",
      emoji: "🔥",
      earned: input.bestStreak >= 7,
      hint: "قدّم كل يوم لمدة أسبوع",
    },
  ];
}

/** The numbers used to detect celebrations before and after a mutation. */
export function motivationSnapshot(apps: AppLike[], history: HistoryLike[], today: string) {
  const days = activityByDay(apps, today);
  const streaks = computeStreaks(days, today);
  const funnel = computeFunnel(apps, groupHistory(history));
  const badges = computeBadges({
    submitted: funnel.submitted,
    interviews: funnel.interviews,
    offers: funnel.offers,
    bestStreak: streaks.best,
  });
  return {
    submitted: funnel.submitted,
    weekCount: weekCount(days, today),
    currentStreak: streaks.current,
    bestStreak: streaks.best,
    earnedBadges: new Set(badges.filter((b) => b.earned).map((b) => b.id)),
    badges,
  };
}

export type MotivationSnapshot = ReturnType<typeof motivationSnapshot>;
