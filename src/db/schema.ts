import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgPolicy, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";

// Relative import (not "@/") so drizzle-kit and the tsx scripts resolve it too.
import {
  DEFAULT_GOAL_PERIOD,
  DEFAULT_GOAL_TARGET,
  GOAL_PERIOD_KEYS,
  JOB_TYPE_KEYS,
  PRIORITY_KEYS,
  SOURCE_KEYS,
  STATUS_KEYS,
  GOAL_TARGET_MAX,
  WORK_MODE_KEYS,
} from "../lib/constants";

// The browser reads and writes these tables through the Supabase Data API with the user's
// Clerk session token, so row level security is what keeps users apart: every policy
// matches `user_id` to the token's `sub` claim. Grants, triggers and functions live in
// the hand-written migration drizzle/0002_rls_functions.sql.

/** The signed-in Clerk user id from the request's token, run once per query. */
const jwtSub = sql`(select auth.jwt()->>'sub')`;

/** Clerk user id ("user_…"). Every row belongs to exactly one user; inserts take it from the token. */
const userId = () =>
  text("user_id")
    .notNull()
    .default(sql`(auth.jwt()->>'sub')`);

const timestampMs = (name: string) => timestamp(name, { withTimezone: true, mode: "date", precision: 3 });

// The browser can skip client-side validation, so the table rejects bad values itself.
const quoted = (keys: readonly string[]) => sql.raw(keys.map((k) => `'${k}'`).join(", "));
const oneOf = (name: string, column: string, keys: readonly string[]) =>
  check(name, sql`${sql.identifier(column)} in (${quoted(keys)})`);
const nullOrOneOf = (name: string, column: string, keys: readonly string[]) =>
  check(name, sql`${sql.identifier(column)} is null or ${sql.identifier(column)} in (${quoted(keys)})`);
const maxLength = (name: string, column: string, max: number) =>
  check(name, sql`char_length(${sql.identifier(column)}) <= ${sql.raw(String(max))}`);
const isoDate = (name: string, column: string) =>
  check(name, sql`${sql.identifier(column)} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'`);

type Verb = "select" | "insert" | "update" | "delete";

/** One policy per verb, each limited to the caller's own rows. */
const ownRows = (table: string, verbs: Verb[]) =>
  verbs.map((verb) =>
    pgPolicy(`${table}_${verb}_own`, {
      for: verb,
      to: authenticatedRole,
      using: verb === "insert" ? undefined : sql`user_id = ${jwtSub}`,
      withCheck: verb === "insert" || verb === "update" ? sql`user_id = ${jwtSub}` : undefined,
    }),
  );

export const applications = pgTable(
  "applications",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    userId: userId(),
    createdAt: timestampMs("created_at").notNull().defaultNow(),
    /** Set by a trigger on every update. */
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
    oneOf("applications_source_check", "source", SOURCE_KEYS),
    nullOrOneOf("applications_job_type_check", "job_type", JOB_TYPE_KEYS),
    nullOrOneOf("applications_work_mode_check", "work_mode", WORK_MODE_KEYS),
    oneOf("applications_status_check", "status", STATUS_KEYS),
    oneOf("applications_priority_check", "priority", PRIORITY_KEYS),
    maxLength("applications_job_title_length", "job_title", 160),
    maxLength("applications_company_length", "company", 160),
    maxLength("applications_location_length", "location", 120),
    maxLength("applications_job_url_length", "job_url", 2048),
    maxLength("applications_expected_salary_length", "expected_salary", 80),
    maxLength("applications_notes_length", "notes", 5000),
    maxLength("applications_follow_up_url_length", "follow_up_url", 2048),
    isoDate("applications_applied_date_format", "applied_date"),
    isoDate("applications_next_follow_up_format", "next_follow_up"),
    ...ownRows("applications", ["select", "insert", "update", "delete"]),
  ],
);

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
    nullOrOneOf("status_history_from_status_check", "from_status", STATUS_KEYS),
    oneOf("status_history_to_status_check", "to_status", STATUS_KEYS),
    // Written by triggers and the backup import; never edited. Rows go with their application.
    ...ownRows("status_history", ["select"]),
    pgPolicy("status_history_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`user_id = ${jwtSub} and exists (
        select 1 from public.applications a where a.id = application_id and a.user_id = ${jwtSub}
      )`,
    }),
  ],
);

/** One row per user, created on their first visit. */
export const settings = pgTable(
  "settings",
  {
    userId: userId().primaryKey(),
    /** Applications per `goalPeriod`; the other periods are derived in lib/goals. */
    goalTarget: integer("goal_target").notNull().default(DEFAULT_GOAL_TARGET),
    goalPeriod: text("goal_period", { enum: GOAL_PERIOD_KEYS }).notNull().default(DEFAULT_GOAL_PERIOD),
    displayName: text("display_name").notNull().default(""),
  },
  () => [
    oneOf("settings_goal_period_check", "goal_period", GOAL_PERIOD_KEYS),
    check(
      "settings_goal_target_range",
      sql`goal_target >= 1 and goal_target <= case goal_period ${sql.raw(
        GOAL_PERIOD_KEYS.map((p) => `when '${p}' then ${GOAL_TARGET_MAX[p]}`).join(" "),
      )} end`,
    ),
    maxLength("settings_display_name_length", "display_name", 40),
    ...ownRows("settings", ["select", "insert", "update"]),
  ],
);

export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;
export type StatusChange = typeof statusHistory.$inferSelect;
export type Settings = typeof settings.$inferSelect;
