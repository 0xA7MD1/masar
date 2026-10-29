import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { applications, settings, statusHistory } from "@/db/schema";

import { DEFAULT_GOAL_PERIOD, DEFAULT_GOAL_TARGET } from "./constants";
import type { Goal } from "./goals";

// Every function takes the signed-in user's id and never returns another user's rows.

export type UserSettings = { goal: Goal; displayName: string };

/** Creates the user's settings row on their first visit. */
export async function getSettings(userId: string): Promise<UserSettings> {
  const db = getDb();
  let [row] = await db.select().from(settings).where(eq(settings.userId, userId));
  if (!row) {
    await db.insert(settings).values({ userId }).onConflictDoNothing();
    [row] = await db.select().from(settings).where(eq(settings.userId, userId));
  }
  return {
    goal: {
      period: row?.goalPeriod ?? DEFAULT_GOAL_PERIOD,
      target: row?.goalTarget ?? DEFAULT_GOAL_TARGET,
    },
    displayName: row?.displayName ?? "",
  };
}

export async function listApplications(userId: string) {
  return getDb()
    .select()
    .from(applications)
    .where(eq(applications.userId, userId))
    .orderBy(desc(applications.appliedDate), desc(applications.id));
}

export async function listHistory(userId: string) {
  return getDb()
    .select()
    .from(statusHistory)
    .where(eq(statusHistory.userId, userId))
    .orderBy(asc(statusHistory.changedAt), asc(statusHistory.id));
}

export async function getApplication(userId: string, id: number) {
  const [row] = await getDb()
    .select()
    .from(applications)
    .where(and(eq(applications.id, id), eq(applications.userId, userId)));
  return row ?? null;
}

export async function getApplicationHistory(userId: string, id: number) {
  return getDb()
    .select()
    .from(statusHistory)
    .where(and(eq(statusHistory.applicationId, id), eq(statusHistory.userId, userId)))
    .orderBy(asc(statusHistory.changedAt), asc(statusHistory.id));
}

export async function getApplicationDetail(userId: string, id: number) {
  const app = await getApplication(userId, id);
  if (!app) return null;
  return { app, history: await getApplicationHistory(userId, id) };
}

export type ApplicationDetail = NonNullable<Awaited<ReturnType<typeof getApplicationDetail>>>;
