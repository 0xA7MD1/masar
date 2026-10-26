// Enum keys are stored in the database; Arabic labels live only in the UI layer.

export const STATUS_KEYS = [
  "saved",
  "applied",
  "contacted",
  "interview",
  "offer",
  "accepted",
  "rejected",
  "ghosted",
] as const;
export type Status = (typeof STATUS_KEYS)[number];

export const PIPELINE_STATUSES: readonly Status[] = [
  "saved",
  "applied",
  "contacted",
  "interview",
  "offer",
  "accepted",
];
export const END_STATUSES: readonly Status[] = ["rejected", "ghosted"];
/** Statuses where the application is finished and needs no follow-up. */
export const CLOSED_STATUSES: readonly Status[] = ["accepted", "rejected", "ghosted"];

type StatusMeta = {
  label: string;
  emoji?: string;
  /** badge background + text */
  badge: string;
  /** solid color for dots, chart marks and timeline nodes */
  color: string;
};

export const STATUS_META: Record<Status, StatusMeta> = {
  saved: { label: "محفوظة", badge: "bg-[#EFEBE2] text-[#625D54]", color: "#A39C8F" },
  applied: { label: "قدّمت", badge: "bg-[#DDEDEA] text-[#1F6F68]", color: "#268F86" },
  contacted: { label: "تم التواصل", badge: "bg-[#DFE6EC] text-[#3E5C76]", color: "#5B7D99" },
  interview: { label: "مقابلة", badge: "bg-[#F3E7CF] text-[#8A5A12]", color: "#C08A2E" },
  offer: { label: "عرض وظيفي", badge: "bg-[#D8E3D3] text-[#00443C]", color: "#00443C" },
  accepted: { label: "مقبول", emoji: "✅", badge: "bg-[#CFE5D4] text-[#1E5B33]", color: "#2F7D4A" },
  rejected: { label: "مرفوض", emoji: "❌", badge: "bg-[#F4DED8] text-[#9A3A2A]", color: "#C2553F" },
  ghosted: { label: "ما ردّوا", emoji: "👻", badge: "bg-[#E7E3EA] text-[#5F566B]", color: "#8C8298" },
};

export function statusLabel(status: Status, withEmoji = true) {
  const meta = STATUS_META[status];
  return withEmoji && meta.emoji ? `${meta.label} ${meta.emoji}` : meta.label;
}

export const SOURCE_KEYS = [
  "linkedin",
  "jadarat",
  "bayt",
  "indeed",
  "company_site",
  "whatsapp",
  "walk_in",
  "referral",
  "other",
] as const;
export type Source = (typeof SOURCE_KEYS)[number];

export const SOURCE_LABELS: Record<Source, string> = {
  linkedin: "LinkedIn",
  jadarat: "جدارات",
  bayt: "Bayt",
  indeed: "Indeed",
  company_site: "موقع الشركة",
  whatsapp: "واتساب",
  walk_in: "حضوري",
  referral: "توصية",
  other: "أخرى",
};

export const JOB_TYPE_KEYS = ["tech", "non_tech"] as const;
export type JobType = (typeof JOB_TYPE_KEYS)[number];
export const JOB_TYPE_LABELS: Record<JobType, string> = {
  tech: "تقنية",
  non_tech: "غير تقنية",
};

export const WORK_MODE_KEYS = ["onsite", "remote", "hybrid"] as const;
export type WorkMode = (typeof WORK_MODE_KEYS)[number];
export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  onsite: "حضوري",
  remote: "عن بعد",
  hybrid: "هجين",
};

export const PRIORITY_KEYS = ["low", "medium", "high"] as const;
export type Priority = (typeof PRIORITY_KEYS)[number];
export const PRIORITY_META: Record<Priority, { label: string; color: string; rank: number }> = {
  low: { label: "منخفضة", color: "#C9C1B2", rank: 0 },
  medium: { label: "متوسطة", color: "#35B0A5", rank: 1 },
  high: { label: "عالية", color: "#D08C2C", rank: 2 },
};

/** Days an application can sit in "applied" before we suggest marking it ghosted. */
export const STALE_AFTER_DAYS = 21;

export const DEFAULT_WEEKLY_GOAL = 10;
