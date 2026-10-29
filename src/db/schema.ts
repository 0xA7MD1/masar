import { boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Relative import (not "@/") so drizzle-kit and the tsx scripts resolve it too.
import {
  DEFAULT_GOAL_PERIOD,
  DEFAULT_GOAL_TARGET,
  GOAL_PERIOD_KEYS,
  JOB_TYPE_KEYS,
  PRIORITY_KEYS,
  SOURCE_KEYS,
  STATUS_KEYS,
  WORK_MODE_KEYS,
} from "../lib/constants";

// RLS is on with no policies: Supabase's public Data API sees nothing, while the app's
// own connection owns the tables and bypasses it. Isolation is done in every query.

/** Clerk user id ("user_…"). Every row belongs to exactly one user. */
const userId = () => text("user_id").notNull();

const timestampMs = (name: string) => timestamp(name, { withTimezone: true, mode: "date", precision: 3 });

export const applications = pgTable(
  "applications",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    userId: userId(),
    createdAt: timestampMs("created_at").notNull().defaultNow(),
    updatedAt: timestampMs("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
    jobTitle: text("job_title").notNull(),
    company: text("company").notNull(),
    source: text("source", { enum: SOURCE_KEYS }).notNull(),
    jobType: text("job_type", { enum: JOB_TYPE_KEYS }),
    workMode: text("work_mode", { enum: WORK_MODE_KEYS }),
    location: text("location"),
    jobUrl: text("job_url"),
    /** YYYY-MM-DD */
    appliedDate: text("applied_date").notNull(),
    status: text("status", { enum: STATUS_KEYS }).notNull().default("applied"),
    expectedSalary: text("expected_salary"),
    cvTailored: boolean("cv_tailored").notNull().default(false),
    /** YYYY-MM-DD */
    nextFollowUp: text("next_follow_up"),
    priority: text("priority", { enum: PRIORITY_KEYS }).notNull().default("medium"),
    notes: text("notes"),
    /** WhatsApp chat, mail search or any page to open when following up. */
    followUpUrl: text("follow_up_url"),
  },
  (t) => [
    index("applications_user_idx").on(t.userId),
    index("applications_user_applied_date_idx").on(t.userId, t.appliedDate),
  ],
).enableRLS();

export const statusHistory = pgTable(
  "status_history",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    userId: userId(),
    applicationId: integer("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    /** null for the entry written when the application is created */
    fromStatus: text("from_status", { enum: STATUS_KEYS }),
    toStatus: text("to_status", { enum: STATUS_KEYS }).notNull(),
    changedAt: timestampMs("changed_at").notNull().defaultNow(),
  },
  (t) => [
    index("status_history_user_idx").on(t.userId),
    index("status_history_application_idx").on(t.applicationId),
  ],
).enableRLS();

/** One row per user, created on their first visit. */
export const settings = pgTable("settings", {
  userId: text("user_id").primaryKey(),
  /** Applications per `goalPeriod`; the other periods are derived in lib/goals. */
  goalTarget: integer("goal_target").notNull().default(DEFAULT_GOAL_TARGET),
  goalPeriod: text("goal_period", { enum: GOAL_PERIOD_KEYS }).notNull().default(DEFAULT_GOAL_PERIOD),
  displayName: text("display_name").notNull().default(""),
}).enableRLS();

export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;
export type StatusChange = typeof statusHistory.$inferSelect;
export type Settings = typeof settings.$inferSelect;
