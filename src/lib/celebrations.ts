import { fullName } from "./application-name";
import { streakPhrase } from "./arabic";
import { GOAL_PERIOD_KEYS, type GoalPeriod, type Status } from "./constants";
import { GOAL_META, type GoalTargets } from "./goals";
import type { MotivationSnapshot } from "./metrics";

export type CelebrationKind =
  | `${GoalPeriod}_goal`
  | "streak_record"
  | "interview"
  | "offer"
  | "accepted"
  | "badge";

export type Celebration = {
  kind: CelebrationKind;
  emoji: string;
  title: string;
  description?: string;
};

/** Everything a mutation sends back to drive confetti and encouraging toasts. */
export type MotivationFeedback = {
  celebrations: Celebration[];
  encouragement?: string;
};

export function snapshotCelebrations(
  before: MotivationSnapshot,
  after: MotivationSnapshot,
  targets: GoalTargets,
): Celebration[] {
  const list: Celebration[] = [];

  // Longest period first: reaching the month usually also closes the day and the week.
  for (const period of [...GOAL_PERIOD_KEYS].reverse()) {
    const target = targets[period];
    const meta = GOAL_META[period];
    if (before.goalCounts[period] < target && after.goalCounts[period] >= target) {
      list.push({
        kind: `${period}_goal`,
        emoji: meta.emoji,
        title: `حققت ${meta.label}!`,
        description: `${after.goalCounts[period]}/${target} ${meta.current} — ${meta.reward}`,
      });
    }
  }

  if (after.currentStreak >= 2 && after.currentStreak > before.bestStreak) {
    list.push({
      kind: "streak_record",
      emoji: "🔥",
      title: "رقم قياسي جديد!",
      description: `${streakPhrase(after.currentStreak)} — أطول سلسلة لك للحين.`,
    });
  }

  for (const badge of after.badges) {
    if (badge.earned && !before.earnedBadges.has(badge.id)) {
      list.push({ kind: "badge", emoji: badge.emoji, title: `إنجاز جديد: ${badge.label}` });
    }
  }

  return list;
}

export function statusCelebration(
  to: Status,
  app: { jobTitle: string; company: string },
): Celebration | null {
  const where = fullName(app);
  switch (to) {
    case "interview":
      return { kind: "interview", emoji: "🎙️", title: "عندك مقابلة!", description: `${where} — جهّز نفسك، أنت قدّها.` };
    case "offer":
      return { kind: "offer", emoji: "🎉", title: "وصلك عرض وظيفي!", description: `${where} — تعبك جاب نتيجة.` };
    case "accepted":
      return { kind: "accepted", emoji: "🏆", title: "مبروك القبول!", description: `${where} — بداية فصل جديد.` };
    default:
      return null;
  }
}

export function rejectionEncouragement(ordinal: number): string {
  return `هذا الطلب رقم ${ordinal} — كل رفض يقرّبك خطوة 💪`;
}
