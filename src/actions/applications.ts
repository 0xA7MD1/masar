"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb } from "@/db";
import { applications, statusHistory, type Application } from "@/db/schema";
import { fail, ok, UNAUTHORIZED_MESSAGE, validationFail, type ActionFailure, type ActionResult } from "@/lib/action-result";
import { requireAuth } from "@/lib/auth/server";
import {
  rejectionEncouragement,
  snapshotCelebrations,
  statusCelebration,
  type MotivationFeedback,
} from "@/lib/celebrations";
import type { Status } from "@/lib/constants";
import { todayISO } from "@/lib/dates";
import { isSubmitted, motivationSnapshot, type MotivationSnapshot } from "@/lib/metrics";
import { getApplication, getSettings, listApplications, listHistory } from "@/lib/queries";
import { applicationSchema, idSchema, statusSchema } from "@/lib/validation";

const NOT_FOUND = "ما لقينا هذا الطلب، يمكن انحذف.";

async function guard(): Promise<ActionFailure | null> {
  try {
    await requireAuth();
    return null;
  } catch {
    return fail(UNAUTHORIZED_MESSAGE);
  }
}

async function loadState(today: string) {
  const [apps, history] = await Promise.all([listApplications(), listHistory()]);
  return { apps, snapshot: motivationSnapshot(apps, history, today) };
}

/** 1-based position of an application among all submitted ones, oldest first. */
function ordinalOf(apps: Application[], id: number): number {
  const sorted = apps
    .filter(isSubmitted)
    .sort((a, b) => a.appliedDate.localeCompare(b.appliedDate) || a.id - b.id);
  return sorted.findIndex((a) => a.id === id) + 1;
}

function statusFeedback(
  app: Pick<Application, "id" | "jobTitle" | "company">,
  to: Status,
  before: MotivationSnapshot,
  after: { apps: Application[]; snapshot: MotivationSnapshot },
  weeklyGoal: number,
): MotivationFeedback {
  const celebrations = snapshotCelebrations(before, after.snapshot, weeklyGoal);
  const special = statusCelebration(to, app);
  if (special) celebrations.unshift(special);
  return {
    celebrations,
    encouragement: to === "rejected" ? rejectionEncouragement(ordinalOf(after.apps, app.id)) : undefined,
  };
}

function revalidateAll() {
  revalidatePath("/", "layout");
}

export async function createApplication(
  formData: FormData,
): Promise<ActionResult<{ id: number } & MotivationFeedback>> {
  const denied = await guard();
  if (denied) return denied;

  const parsed = applicationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationFail(parsed.error);
  const values = parsed.data;

  const today = todayISO();
  const [{ snapshot: before }, { weeklyGoal }] = await Promise.all([loadState(today), getSettings()]);

  const db = getDb();
  const now = new Date();
  // One batch = one transaction, so the history row can safely use last_insert_rowid().
  const [inserted] = await db.batch([
    db
      .insert(applications)
      .values({ ...values, appliedDate: values.appliedDate ?? today, createdAt: now, updatedAt: now })
      .returning({ id: applications.id }),
    db.insert(statusHistory).values({
      applicationId: sql`last_insert_rowid()`,
      fromStatus: null,
      toStatus: values.status,
      changedAt: now,
    }),
  ]);
  const id = inserted[0].id;

  const after = await loadState(today);
  const feedback = statusFeedback({ id, ...values }, values.status, before, after, weeklyGoal);
  revalidateAll();
  return ok({ id, ...feedback });
}

export async function updateApplication(
  id: number,
  formData: FormData,
): Promise<ActionResult<MotivationFeedback>> {
  const denied = await guard();
  if (denied) return denied;

  const parsedId = idSchema.safeParse(id);
  const parsed = applicationSchema.safeParse(Object.fromEntries(formData));
  if (!parsedId.success) return fail(NOT_FOUND);
  if (!parsed.success) return validationFail(parsed.error);

  const existing = await getApplication(parsedId.data);
  if (!existing) return fail(NOT_FOUND);

  const values = parsed.data;
  const today = todayISO();
  const statusChanged = values.status !== existing.status;
  const [{ snapshot: before }, { weeklyGoal }] = await Promise.all([loadState(today), getSettings()]);

  const db = getDb();
  const now = new Date();
  const update = db
    .update(applications)
    .set({ ...values, appliedDate: values.appliedDate ?? existing.appliedDate, updatedAt: now })
    .where(eq(applications.id, existing.id));

  if (statusChanged) {
    await db.batch([
      update,
      db.insert(statusHistory).values({
        applicationId: existing.id,
        fromStatus: existing.status,
        toStatus: values.status,
        changedAt: now,
      }),
    ]);
  } else {
    await update;
  }

  const after = await loadState(today);
  revalidateAll();
  if (!statusChanged) {
    return ok({ celebrations: snapshotCelebrations(before, after.snapshot, weeklyGoal) });
  }
  return ok(statusFeedback({ ...existing, ...values }, values.status, before, after, weeklyGoal));
}

export async function updateApplicationStatus(
  id: number,
  status: Status,
): Promise<ActionResult<MotivationFeedback>> {
  const denied = await guard();
  if (denied) return denied;

  const parsedId = idSchema.safeParse(id);
  const parsedStatus = statusSchema.safeParse(status);
  if (!parsedId.success) return fail(NOT_FOUND);
  if (!parsedStatus.success) return fail("حالة غير معروفة.");

  const existing = await getApplication(parsedId.data);
  if (!existing) return fail(NOT_FOUND);
  const to = parsedStatus.data;
  if (existing.status === to) return ok({ celebrations: [] });

  const today = todayISO();
  const [{ snapshot: before }, { weeklyGoal }] = await Promise.all([loadState(today), getSettings()]);

  const db = getDb();
  const now = new Date();
  // Moving a bookmark into the pipeline means it was applied for today.
  const appliedDate = existing.status === "saved" && to !== "saved" ? today : existing.appliedDate;
  await db.batch([
    db
      .update(applications)
      .set({ status: to, appliedDate, updatedAt: now })
      .where(eq(applications.id, existing.id)),
    db.insert(statusHistory).values({
      applicationId: existing.id,
      fromStatus: existing.status,
      toStatus: to,
      changedAt: now,
    }),
  ]);

  const after = await loadState(today);
  revalidateAll();
  return ok(statusFeedback(existing, to, before, after, weeklyGoal));
}

export async function deleteApplication(id: number): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return fail(NOT_FOUND);

  const db = getDb();
  // History is deleted explicitly because SQLite foreign keys may be off on some connections.
  await db.batch([
    db.delete(statusHistory).where(eq(statusHistory.applicationId, parsedId.data)),
    db.delete(applications).where(eq(applications.id, parsedId.data)),
  ]);
  revalidateAll();
  return ok(null);
}
