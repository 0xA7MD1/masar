import { streakPhrase } from "./arabic";
import type { Status } from "./constants";
import type { MotivationSnapshot } from "./metrics";

export type CelebrationKind = "weekly_goal" | "streak_record" | "interview" | "offer" | "accepted" | "badge";

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
  weeklyGoal: number,
): Celebration[] {
  const list: Celebration[] = [];

  if (before.weekCount < weeklyGoal && after.weekCount >= weeklyGoal) {
    list.push({
      kind: "weekly_goal",
      emoji: "🎯",
      title: "حققت هدف الأسبوع!",
      description: `${after.weekCount}/${weeklyGoal} هذا الأسبوع — شغل عظيم، كمّل بنفس الروح.`,
    });
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
  const where = `${app.jobTitle} في ${app.company}`;
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
