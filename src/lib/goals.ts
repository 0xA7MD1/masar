// One goal is stored (a target for a single period); the targets for the other
// periods are derived from it, assuming applications can go out any day of the week.
import { GOAL_PERIOD_KEYS, type GoalPeriod } from "./constants";
import { daysInMonth, monthKey, weekStartISO } from "./dates";

export type Goal = { period: GoalPeriod; target: number };
export type GoalTargets = Record<GoalPeriod, number>;

const DAYS_PER_WEEK = 7;

export const GOAL_META: Record<
  GoalPeriod,
  { label: string; unit: string; current: string; emoji: string; badge: string; reward: string }
> = {
  day: {
    label: "هدف اليوم",
    unit: "باليوم",
    current: "اليوم",
    emoji: "☀️",
    badge: "يوم مكتمل",
    reward: "يوم منجز، ارتاح وأنت مرتاح البال.",
  },
  week: {
    label: "هدف الأسبوع",
    unit: "بالأسبوع",
    current: "هذا الأسبوع",
    emoji: "🎯",
    badge: "أسبوع مكتمل",
    reward: "أسبوع كامل على الهدف، شغل عظيم.",
  },
  month: {
    label: "هدف الشهر",
    unit: "بالشهر",
    current: "هذا الشهر",
    emoji: "🏆",
    badge: "شهر مكتمل",
    reward: "شهر كامل على الهدف، هذا التزام يرفع الراس.",
  },
};

/** Targets for the day, week and month that contain `today`. */
export function goalTargets(goal: Goal, today: string): GoalTargets {
  const monthDays = daysInMonth(today);
  const { target } = goal;
  switch (goal.period) {
    case "day":
      return { day: target, week: target * DAYS_PER_WEEK, month: target * monthDays };
    case "week":
      return {
        day: Math.ceil(target / DAYS_PER_WEEK),
        week: target,
        month: Math.round((target * monthDays) / DAYS_PER_WEEK),
      };
    case "month":
      return {
        day: Math.ceil(target / monthDays),
        week: Math.ceil((target * DAYS_PER_WEEK) / monthDays),
        month: target,
      };
  }
}

export type GoalCounts = Record<GoalPeriod, number>;

/** Applications in the current day, week and month. */
export function goalCounts(days: Map<string, number>, today: string): GoalCounts {
  const week = weekStartISO(today);
  const month = monthKey(today);
  const counts: GoalCounts = { day: 0, week: 0, month: 0 };
  for (const [date, count] of days) {
    if (date > today) continue;
    if (date === today) counts.day += count;
    if (date >= week) counts.week += count;
    if (monthKey(date) === month) counts.month += count;
  }
  return counts;
}

/** How many days, weeks and months reached their goal, including the current ones. */
export function goalWins(days: Map<string, number>, goal: Goal, today: string): GoalCounts {
  const byPeriod: Record<GoalPeriod, Map<string, { count: number; sample: string }>> = {
    day: new Map(),
    week: new Map(),
    month: new Map(),
  };
  for (const [date, count] of days) {
    if (date > today) continue;
    const keys: Record<GoalPeriod, string> = { day: date, week: weekStartISO(date), month: monthKey(date) };
    for (const period of GOAL_PERIOD_KEYS) {
      const key = keys[period];
      const bucket = byPeriod[period].get(key);
      if (bucket) bucket.count += count;
      else byPeriod[period].set(key, { count, sample: date });
    }
  }
  const wins: GoalCounts = { day: 0, week: 0, month: 0 };
  for (const period of GOAL_PERIOD_KEYS) {
    for (const { count, sample } of byPeriod[period].values()) {
      // Monthly targets depend on the month's length, so each bucket uses its own.
      if (count >= goalTargets(goal, sample)[period]) wins[period]++;
    }
  }
  return wins;
}
