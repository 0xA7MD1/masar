import { z } from "zod";

import {
  GOAL_PERIOD_KEYS,
  GOAL_TARGET_MAX,
  JOB_TYPE_KEYS,
  PRIORITY_KEYS,
  SOURCE_KEYS,
  STATUS_KEYS,
  WORK_MODE_KEYS,
} from "./constants";
import { ISO_DATE_RE } from "./dates";
import { detectSource, toFollowUpUrl, toWesternDigits } from "./links";

const blankToNull = (value: unknown) =>
  value === undefined || (typeof value === "string" && value.trim() === "") ? null : value;

const blankToUndefined = (value: unknown) => blankToNull(value) ?? undefined;

const optionalText = (max: number) =>
  z.preprocess(blankToNull, z.string().trim().max(max, `الحد الأقصى ${max} حرف`).nullable());

const optionalDate = z.preprocess(blankToNull, z.string().regex(ISO_DATE_RE, "تاريخ غير صالح").nullable());

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Accepts "linkedin.com/jobs/1" and stores it as "https://linkedin.com/jobs/1". */
const optionalUrl = z.preprocess(
  (value) => {
    const v = blankToNull(value);
    if (typeof v !== "string") return v;
    const trimmed = v.trim();
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  },
  z.string().max(2048).refine(isHttpUrl, "الرابط غير صالح").nullable(),
);

const checkbox = z.preprocess(
  (value) => value === true || value === "on" || value === "true" || value === "1",
  z.boolean(),
);

export const statusSchema = z.enum(STATUS_KEYS, { error: "حالة غير معروفة" });
export const idSchema = z.coerce.number().int().positive();

/** Optional, but stored as "" (not null) so the columns stay NOT NULL. */
const optionalName = (tooLong: string) =>
  z.preprocess((value) => value ?? "", z.string().trim().max(160, tooLong));

/** Accepts a URL, a phone number (→ WhatsApp) or an email (→ Gmail search). */
const followUpUrl = z.preprocess(
  (value) => {
    const v = blankToNull(value);
    return typeof v === "string" ? (toFollowUpUrl(v) ?? false) : v;
  },
  z
    .string({ error: "حط رابط، أو رقم جوال، أو إيميل" })
    .max(2048)
    .nullable(),
);

const applicationFields = z.object({
  jobTitle: optionalName("المسمى طويل جداً"),
  company: optionalName("اسم الشركة طويل جداً"),
  source: z.preprocess(blankToNull, z.enum(SOURCE_KEYS).nullable()),
  jobType: z.preprocess(blankToNull, z.enum(JOB_TYPE_KEYS).nullable()),
  workMode: z.preprocess(blankToNull, z.enum(WORK_MODE_KEYS).nullable()),
  location: optionalText(120),
  jobUrl: optionalUrl,
  /** Filled with today's date when left empty. */
  appliedDate: optionalDate,
  status: z.preprocess(blankToUndefined, statusSchema.default("applied")),
  expectedSalary: optionalText(80),
  cvTailored: checkbox,
  nextFollowUp: optionalDate,
  priority: z.preprocess(blankToUndefined, z.enum(PRIORITY_KEYS).default("medium")),
  notes: optionalText(5000),
  followUpUrl,
});

/** Without a picked source, the job link decides it (the form does the same live). */
export const applicationSchema = applicationFields.transform((values, ctx) => {
  const source = values.source ?? detectSource(values.jobUrl);
  if (!source) {
    ctx.addIssue({ code: "custom", path: ["source"], message: "حط رابط الوظيفة أو اختر من وين لقيتها" });
    return z.NEVER;
  }
  // A WhatsApp job link is also where the follow-up happens.
  const followUpUrl = values.followUpUrl ?? (source === "whatsapp" ? values.jobUrl : null);
  return { ...values, source, followUpUrl };
});

export type ApplicationValues = z.output<typeof applicationSchema>;

export const settingsSchema = z
  .object({
    displayName: z.string().trim().max(40, "الاسم طويل شوي، خله 40 حرف أو أقل"),
    goalPeriod: z.enum(GOAL_PERIOD_KEYS, { error: "اختر يومي أو أسبوعي أو شهري" }),
    goalTarget: z.preprocess(
      (v) => (typeof v === "string" ? toWesternDigits(v.trim()) : v),
      z.coerce.number({ error: "اكتب رقم" }).int("اكتب رقم صحيح").min(1, "الهدف لازم يكون 1 أو أكثر"),
    ),
  })
  .superRefine((values, ctx) => {
    const max = GOAL_TARGET_MAX[values.goalPeriod];
    if (values.goalTarget > max) {
      ctx.addIssue({ code: "custom", path: ["goalTarget"], message: `خلّ الهدف ${max} أو أقل` });
    }
  });

// Backups use snake_case keys that mirror the database columns.
const timestamp = z
  .union([z.number(), z.string()])
  .transform((v) => new Date(v))
  .refine((d) => !Number.isNaN(d.getTime()), "وقت غير صالح");

const nullableText = (max: number) =>
  z
    .string()
    .max(max)
    .nullish()
    .transform((v) => v ?? null);

export const backupSchema = z.object({
  app: z.literal("masar").optional(),
  version: z.literal(1, { error: "نسخة الملف غير مدعومة" }),
  settings: z
    .object({
      // Backups made before goal periods existed only carry weekly_goal.
      weekly_goal: z.number().int().min(1).max(GOAL_TARGET_MAX.week).optional(),
      goal_period: z.enum(GOAL_PERIOD_KEYS).optional(),
      goal_target: z.number().int().min(1).max(GOAL_TARGET_MAX.month).optional(),
      display_name: z.string().max(40),
    })
    .nullish(),
  applications: z
    .array(
      z.object({
        id: z.number().int().positive(),
        created_at: timestamp,
        updated_at: timestamp,
        job_title: z.string().trim().max(160),
        company: z.string().trim().max(160),
        source: z.enum(SOURCE_KEYS),
        job_type: z.enum(JOB_TYPE_KEYS).nullish().transform((v) => v ?? null),
        work_mode: z.enum(WORK_MODE_KEYS).nullish().transform((v) => v ?? null),
        location: nullableText(120),
        job_url: nullableText(2048),
        applied_date: z.string().regex(ISO_DATE_RE),
        status: statusSchema,
        expected_salary: nullableText(80),
        cv_tailored: z.boolean(),
        next_follow_up: z
          .string()
          .regex(ISO_DATE_RE)
          .nullish()
          .transform((v) => v ?? null),
        priority: z.enum(PRIORITY_KEYS),
        notes: nullableText(5000),
        follow_up_url: nullableText(2048),
      }),
    )
    .max(10_000),
  status_history: z
    .array(
      z.object({
        id: z.number().int().positive(),
        application_id: z.number().int().positive(),
        from_status: statusSchema.nullish().transform((v) => v ?? null),
        to_status: statusSchema,
        changed_at: timestamp,
      }),
    )
    .max(100_000),
});

export type Backup = z.input<typeof backupSchema>;
