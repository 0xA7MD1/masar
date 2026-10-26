import "server-only";

import { and, asc, desc, eq, gte, lte, or, sql, type AnyColumn, type SQL } from "drizzle-orm";

import { getDb } from "@/db";
import { applications, settings, statusHistory } from "@/db/schema";

import { DEFAULT_GOAL_PERIOD, DEFAULT_GOAL_TARGET, PRIORITY_KEYS, STATUS_KEYS } from "./constants";
import type { ApplicationFilters, SortKey } from "./filters";
import type { Goal } from "./goals";

export async function getSettings() {
  const [row] = await getDb().select().from(settings).where(eq(settings.id, 1));
  const goal: Goal = {
    period: row?.goalPeriod ?? DEFAULT_GOAL_PERIOD,
    target: row?.goalTarget ?? DEFAULT_GOAL_TARGET,
  };
  return { goal, displayName: row?.displayName ?? "" };
}

export async function listApplications() {
  return getDb()
    .select()
    .from(applications)
    .orderBy(desc(applications.appliedDate), desc(applications.id));
}

export async function listHistory() {
  return getDb().select().from(statusHistory).orderBy(asc(statusHistory.changedAt), asc(statusHistory.id));
}

export async function getApplication(id: number) {
  const [row] = await getDb().select().from(applications).where(eq(applications.id, id));
  return row ?? null;
}

export async function getApplicationHistory(id: number) {
  return getDb()
    .select()
    .from(statusHistory)
    .where(eq(statusHistory.applicationId, id))
    .orderBy(asc(statusHistory.changedAt), asc(statusHistory.id));
}

export async function getRecentActivity(limit = 8) {
  return getDb()
    .select({
      id: statusHistory.id,
      applicationId: statusHistory.applicationId,
      fromStatus: statusHistory.fromStatus,
      toStatus: statusHistory.toStatus,
      changedAt: statusHistory.changedAt,
      jobTitle: applications.jobTitle,
      company: applications.company,
    })
    .from(statusHistory)
    .innerJoin(applications, eq(statusHistory.applicationId, applications.id))
    .orderBy(desc(statusHistory.changedAt), desc(statusHistory.id))
    .limit(limit);
}

export type ActivityItem = Awaited<ReturnType<typeof getRecentActivity>>[number];

/** CASE expression that orders an enum column by its declared order. */
function enumOrder(column: AnyColumn, keys: readonly string[]) {
  const cases = keys.map((key, i) => sql`WHEN ${key} THEN ${i}`);
  return sql`CASE ${column} ${sql.join(cases, sql` `)} END`;
}

function sortExpression(sort: SortKey) {
  switch (sort) {
    case "job_title":
      return applications.jobTitle;
    case "company":
      return applications.company;
    case "status":
      return enumOrder(applications.status, STATUS_KEYS);
    case "priority":
      return enumOrder(applications.priority, PRIORITY_KEYS);
    case "updated_at":
      return applications.updatedAt;
    default:
      return applications.appliedDate;
  }
}

export async function searchApplications(filters: ApplicationFilters) {
  const conditions: SQL[] = [];
  if (filters.q) {
    const needle = filters.q.toLowerCase();
    const contains = (column: AnyColumn) => sql`instr(lower(coalesce(${column}, '')), ${needle}) > 0`;
    conditions.push(
      or(
        contains(applications.jobTitle),
        contains(applications.company),
        contains(applications.location),
        contains(applications.notes),
      )!,
    );
  }
  if (filters.status) conditions.push(eq(applications.status, filters.status));
  if (filters.source) conditions.push(eq(applications.source, filters.source));
  if (filters.jobType) conditions.push(eq(applications.jobType, filters.jobType));
  if (filters.from) conditions.push(gte(applications.appliedDate, filters.from));
  if (filters.to) conditions.push(lte(applications.appliedDate, filters.to));

  const order = filters.dir === "asc" ? asc : desc;
  return getDb()
    .select()
    .from(applications)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(order(sortExpression(filters.sort)), desc(applications.id));
}
