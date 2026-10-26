"use server";

import type { BatchItem } from "drizzle-orm/batch";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import { applications, settings, statusHistory } from "@/db/schema";
import { fail, ok, UNAUTHORIZED_MESSAGE, validationFail, type ActionResult } from "@/lib/action-result";
import { endSession, requireAuth } from "@/lib/auth/server";
import { GOAL_TARGET_MAX } from "@/lib/constants";
import { backupSchema, settingsSchema } from "@/lib/validation";

async function isAllowed(): Promise<boolean> {
  try {
    await requireAuth();
    return true;
  } catch {
    return false;
  }
}

export async function updateSettings(formData: FormData): Promise<ActionResult> {
  if (!(await isAllowed())) return fail(UNAUTHORIZED_MESSAGE);

  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationFail(parsed.error);

  await getDb()
    .insert(settings)
    .values({ id: 1, ...parsed.data })
    .onConflictDoUpdate({ target: settings.id, set: parsed.data });
  revalidatePath("/", "layout");
  return ok(null);
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/login");
}

const chunk = <T,>(items: T[], size: number) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));

/** Replaces all data with the contents of a JSON backup, in a single transaction. */
export async function importBackup(
  data: unknown,
): Promise<ActionResult<{ applications: number; history: number }>> {
  if (!(await isAllowed())) return fail(UNAUTHORIZED_MESSAGE);

  const parsed = backupSchema.safeParse(data);
  if (!parsed.success) {
    return fail("الملف مو نسخة احتياطية صالحة من مسار. تأكد إنه ملف JSON صدّرته من الإعدادات.");
  }
  const backup = parsed.data;
  const ids = new Set(backup.applications.map((a) => a.id));
  if (ids.size !== backup.applications.length) return fail("الملف فيه طلبات مكررة بنفس المعرّف.");
  const history = backup.status_history.filter((h) => ids.has(h.application_id));

  const db = getDb();
  const statements: BatchItem<"sqlite">[] = [db.delete(statusHistory), db.delete(applications)];

  // Chunked to stay well under SQLite's bound-parameter limit.
  for (const rows of chunk(backup.applications, 40)) {
    statements.push(
      db.insert(applications).values(
        rows.map((a) => ({
          id: a.id,
          createdAt: a.created_at,
          updatedAt: a.updated_at,
          jobTitle: a.job_title,
          company: a.company,
          source: a.source,
          jobType: a.job_type,
          workMode: a.work_mode,
          location: a.location,
          jobUrl: a.job_url,
          appliedDate: a.applied_date,
          status: a.status,
          expectedSalary: a.expected_salary,
          cvTailored: a.cv_tailored,
          nextFollowUp: a.next_follow_up,
          priority: a.priority,
          notes: a.notes,
          followUpUrl: a.follow_up_url,
        })),
      ),
    );
  }
  for (const rows of chunk(history, 150)) {
    statements.push(
      db.insert(statusHistory).values(
        rows.map((h) => ({
          id: h.id,
          applicationId: h.application_id,
          fromStatus: h.from_status,
          toStatus: h.to_status,
          changedAt: h.changed_at,
        })),
      ),
    );
  }
  if (backup.settings) {
    const { goal_period, goal_target, weekly_goal, display_name } = backup.settings;
    const values = {
      displayName: display_name,
      ...(goal_period && goal_target
        ? { goalPeriod: goal_period, goalTarget: Math.min(goal_target, GOAL_TARGET_MAX[goal_period]) }
        : weekly_goal
          ? { goalPeriod: "week" as const, goalTarget: weekly_goal }
          : {}),
    };
    statements.push(
      db.insert(settings).values({ id: 1, ...values }).onConflictDoUpdate({ target: settings.id, set: values }),
    );
  }

  const [firstStatement, ...rest] = statements;
  await db.batch([firstStatement, ...rest]);
  revalidatePath("/", "layout");
  return ok({ applications: backup.applications.length, history: history.length });
}
