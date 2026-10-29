"use server";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { applications, statusHistory, type Application } from "@/db/schema";
import { fail, ok, UNAUTHORIZED_MESSAGE, validationFail, type ActionResult } from "@/lib/action-result";
import {
  rejectionEncouragement,
  snapshotCelebrations,
  statusCelebration,
  type MotivationFeedback,
} from "@/lib/celebrations";
import type { Status } from "@/lib/constants";
import { todayISO } from "@/lib/dates";
import { goalTargets, type GoalTargets } from "@/lib/goals";
import { isSubmitted, motivationSnapshot, type MotivationSnapshot } from "@/lib/metrics";
import { getApplication, getSettings, listApplications, listHistory } from "@/lib/queries";
import { currentUserId } from "@/lib/user";
import { applicationSchema, idSchema, statusSchema } from "@/lib/validation";

const NOT_FOUND = "ما لقينا هذا الطلب، يمكن انحذف.";

async function loadState(userId: string, today: string) {
  const [apps, history] = await Promise.all([listApplications(userId), listHistory(userId)]);
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
  targets: GoalTargets,
): MotivationFeedback {
  const celebrations = snapshotCelebrations(before, after.snapshot, targets);
  const special = statusCelebration(to, app);
  if (special) celebrations.unshift(special);
  return {
    celebrations,
    encouragement: to === "rejected" ? rejectionEncouragement(ordinalOf(after.apps, app.id)) : undefined,
  };
}

/** Matches one application only when it belongs to the signed-in user. */
const ownApplication = (userId: string, id: number) =>
  and(eq(applications.id, id), eq(applications.userId, userId));

export async function createApplication(
  formData: FormData,
): Promise<ActionResult<{ id: number } & MotivationFeedback>> {
  const userId = await currentUserId();
  if (!userId) return fail(UNAUTHORIZED_MESSAGE);

  const parsed = applicationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationFail(parsed.error);
  const values = parsed.data;

  const today = todayISO();
  const [{ snapshot: before }, { goal }] = await Promise.all([loadState(userId, today), getSettings(userId)]);
  const targets = goalTargets(goal, today);

  const now = new Date();
  const id = await getDb().transaction(async (tx) => {
    const [inserted] = await tx
      .insert(applications)
      .values({ ...values, userId, appliedDate: values.appliedDate ?? today, createdAt: now, updatedAt: now })
      .returning({ id: applications.id });
    await tx.insert(statusHistory).values({
      userId,
      applicationId: inserted.id,
      fromStatus: null,
      toStatus: values.status,
      changedAt: now,
    });
    return inserted.id;
  });

  const after = await loadState(userId, today);
  const feedback = statusFeedback({ id, ...values }, values.status, before, after, targets);
  return ok({ id, ...feedback });
}

export async function updateApplication(
  id: number,
  formData: FormData,
): Promise<ActionResult<MotivationFeedback>> {
  const userId = await currentUserId();
  if (!userId) return fail(UNAUTHORIZED_MESSAGE);

  const parsedId = idSchema.safeParse(id);
  const parsed = applicationSchema.safeParse(Object.fromEntries(formData));
  if (!parsedId.success) return fail(NOT_FOUND);
  if (!parsed.success) return validationFail(parsed.error);

  const existing = await getApplication(userId, parsedId.data);
  if (!existing) return fail(NOT_FOUND);

  const values = parsed.data;
  const today = todayISO();
  const statusChanged = values.status !== existing.status;
  const [{ snapshot: before }, { goal }] = await Promise.all([loadState(userId, today), getSettings(userId)]);
  const targets = goalTargets(goal, today);

  const now = new Date();
  await getDb().transaction(async (tx) => {
    await tx
      .update(applications)
      .set({ ...values, appliedDate: values.appliedDate ?? existing.appliedDate, updatedAt: now })
      .where(ownApplication(userId, existing.id));
    if (statusChanged) {
      await tx.insert(statusHistory).values({
        userId,
        applicationId: existing.id,
        fromStatus: existing.status,
        toStatus: values.status,
        changedAt: now,
      });
    }
  });

  const after = await loadState(userId, today);
  if (!statusChanged) {
    return ok({ celebrations: snapshotCelebrations(before, after.snapshot, targets) });
  }
  return ok(statusFeedback({ ...existing, ...values }, values.status, before, after, targets));
}

export async function updateApplicationStatus(
  id: number,
  status: Status,
): Promise<ActionResult<MotivationFeedback>> {
  const userId = await currentUserId();
  if (!userId) return fail(UNAUTHORIZED_MESSAGE);

  const parsedId = idSchema.safeParse(id);
  const parsedStatus = statusSchema.safeParse(status);
  if (!parsedId.success) return fail(NOT_FOUND);
  if (!parsedStatus.success) return fail("حالة غير معروفة.");

  const existing = await getApplication(userId, parsedId.data);
  if (!existing) return fail(NOT_FOUND);
  const to = parsedStatus.data;
  if (existing.status === to) return ok({ celebrations: [] });

  const today = todayISO();
  const [{ snapshot: before }, { goal }] = await Promise.all([loadState(userId, today), getSettings(userId)]);
  const targets = goalTargets(goal, today);

  const now = new Date();
  // Moving a bookmark into the pipeline means it was applied for today.
  const appliedDate = existing.status === "saved" && to !== "saved" ? today : existing.appliedDate;
  await getDb().transaction(async (tx) => {
    await tx
      .update(applications)
      .set({ status: to, appliedDate, updatedAt: now })
      .where(ownApplication(userId, existing.id));
    await tx.insert(statusHistory).values({
      userId,
      applicationId: existing.id,
      fromStatus: existing.status,
      toStatus: to,
      changedAt: now,
    });
  });

  const after = await loadState(userId, today);
  return ok(statusFeedback(existing, to, before, after, targets));
}

export async function deleteApplication(id: number): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return fail(UNAUTHORIZED_MESSAGE);

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return fail(NOT_FOUND);

  // Status history goes with it through the foreign key's ON DELETE CASCADE.
  const deleted = await getDb()
    .delete(applications)
    .where(ownApplication(userId, parsedId.data))
    .returning({ id: applications.id });
  if (deleted.length === 0) return fail(NOT_FOUND);
  return ok(null);
}
