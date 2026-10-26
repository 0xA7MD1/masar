// Date-only values are stored as "YYYY-MM-DD" strings and treated as UTC midnights
// for arithmetic, so results never drift with the server's timezone.

export const APP_TIME_ZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE || "Asia/Riyadh";

const MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

export const WEEKDAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
export const WEEKDAY_INITIALS = ["ح", "ن", "ث", "ر", "خ", "ج", "س"];

const DAY_MS = 86_400_000;

export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Calendar date of an instant in the app timezone. */
export function toISODate(date: Date, timeZone = APP_TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(iso: string, days: number): string {
  return new Date(parseISODate(iso).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function diffDays(to: string, from: string): number {
  return Math.round((parseISODate(to).getTime() - parseISODate(from).getTime()) / DAY_MS);
}

/** Weeks start on Sunday, matching the Saudi work week. */
export function weekStartISO(iso: string): string {
  return addDays(iso, -parseISODate(iso).getUTCDay());
}

export function weekdayIndex(iso: string): number {
  return parseISODate(iso).getUTCDay();
}

export function monthLabel(iso: string): string {
  return MONTHS[parseISODate(iso).getUTCMonth()];
}

/** "26 أكتوبر 2026" */
export function formatDate(iso: string): string {
  const d = parseISODate(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "26 أكتوبر" */
export function formatShortDate(iso: string): string {
  const d = parseISODate(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** "3:45 م" in the app timezone. */
export function formatTime(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "";
  const period = parts.find((p) => p.type === "dayPeriod")?.value === "PM" ? "م" : "ص";
  return `${hour}:${minute} ${period}`;
}

/** "26 أكتوبر 2026 · 3:45 م" in the app timezone. */
export function formatDateTime(date: Date): string {
  return `${formatDate(toISODate(date))} · ${formatTime(date)}`;
}

/** "اليوم · 3:45 م" / "قبل 3 أيام" / "12 سبتمبر 2026" */
export function formatActivityTime(date: Date, today: string): string {
  const day = toISODate(date);
  const age = diffDays(today, day);
  if (age === 0 || age === 1) return `${relativeDays(day, today)} · ${formatTime(date)}`;
  return age > 1 && age <= 6 ? relativeDays(day, today) : formatDate(day);
}

export function hourInAppTimeZone(date = new Date()): number {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    hour: "numeric",
    hourCycle: "h23",
  }).format(date);
  return Number(hour);
}

/** "اليوم" / "أمس" / "قبل يومين" / "قبل 5 أيام" / "قبل 12 يوم" */
export function relativeDays(iso: string, today: string): string {
  const days = diffDays(today, iso);
  if (days < 0) return `بعد ${daysPhrase(-days)}`;
  if (days === 0) return "اليوم";
  if (days === 1) return "أمس";
  if (days === 2) return "قبل يومين";
  return `قبل ${daysPhrase(days)}`;
}

/** "يوم" / "يومين" / "5 أيام" / "12 يوم" */
export function daysPhrase(n: number): string {
  if (n === 1) return "يوم";
  if (n === 2) return "يومين";
  if (n >= 3 && n <= 10) return `${n} أيام`;
  return `${n} يوم`;
}
