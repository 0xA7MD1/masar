import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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

export const applications = sqliteTable(
  "applications",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date())
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
    cvTailored: integer("cv_tailored", { mode: "boolean" }).notNull().default(false),
    /** YYYY-MM-DD */
    nextFollowUp: text("next_follow_up"),
    priority: text("priority", { enum: PRIORITY_KEYS }).notNull().default("medium"),
    notes: text("notes"),
    /** WhatsApp chat, mail search or any page to open when following up. */
    followUpUrl: text("follow_up_url"),
  },
  (t) => [
    index("applications_status_idx").on(t.status),
    index("applications_applied_date_idx").on(t.appliedDate),
  ],
);

export const statusHistory = sqliteTable(
  "status_history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    applicationId: integer("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    /** null for the entry written when the application is created */
    fromStatus: text("from_status", { enum: STATUS_KEYS }),
    toStatus: text("to_status", { enum: STATUS_KEYS }).notNull(),
    changedAt: integer("changed_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("status_history_application_idx").on(t.applicationId)],
);

/** Single row, always id = 1. */
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey(),
  /** Applications per `goalPeriod`; the other periods are derived in lib/goals. */
  goalTarget: integer("goal_target").notNull().default(DEFAULT_GOAL_TARGET),
  goalPeriod: text("goal_period", { enum: GOAL_PERIOD_KEYS }).notNull().default(DEFAULT_GOAL_PERIOD),
  displayName: text("display_name").notNull().default(""),
});

/** Failed login counter per client key (IP), used for rate limiting. */
export const loginAttempts = sqliteTable("login_attempts", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  windowStart: integer("window_start", { mode: "timestamp_ms" }).notNull(),
  lockedUntil: integer("locked_until", { mode: "timestamp_ms" }),
});

export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;
export type StatusChange = typeof statusHistory.$inferSelect;
export type Settings = typeof settings.$inferSelect;
