import { eq, sql } from "drizzle-orm";
import type { z } from "zod";

// Relative imports (not "@/") so the tsx scripts can use this too.
import { GOAL_TARGET_MAX } from "../lib/constants";
import type { backupSchema } from "../lib/validation";
import type { Db } from "./client";
import { applications, settings, statusHistory } from "./schema";

export type BackupData = z.output<typeof backupSchema>;

const chunk = <T,>(items: T[], size: number) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));

/**
 * Replaces one user's applications, history and settings with `data`, in one transaction.
 * Ids are shared by every user, so rows get fresh ids and history follows the mapping.
 */
export async function replaceUserData(db: Db, userId: string, data: BackupData) {
  const ids = new Set(data.applications.map((a) => a.id));
  const history = data.status_history.filter((h) => ids.has(h.application_id)).sort((a, b) => a.id - b.id);

  await db.transaction(async (tx) => {
    // History goes with the applications through ON DELETE CASCADE.
    await tx.delete(applications).where(eq(applications.userId, userId));

    // Reserve the new ids up front so the old → new mapping never depends on RETURNING order.
    const reserved = await tx
      .select({ id: sql<number>`nextval(pg_get_serial_sequence('applications', 'id'))::int`.mapWith(Number) })
      .from(sql`generate_series(1, ${data.applications.length})`);
    const newIds = new Map(data.applications.map((a, i) => [a.id, reserved[i].id]));

    for (const rows of chunk(data.applications, 200)) {
      await tx.insert(applications).values(
        rows.map((a) => ({
          id: newIds.get(a.id)!,
          userId,
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
      );
    }

    for (const rows of chunk(history, 500)) {
      await tx.insert(statusHistory).values(
        rows.map((h) => ({
          userId,
          applicationId: newIds.get(h.application_id)!,
          fromStatus: h.from_status,
          toStatus: h.to_status,
          changedAt: h.changed_at,
        })),
      );
    }

    if (data.settings) {
      const { goal_period, goal_target, weekly_goal, display_name } = data.settings;
      const values = {
        displayName: display_name,
        ...(goal_period && goal_target
          ? { goalPeriod: goal_period, goalTarget: Math.min(goal_target, GOAL_TARGET_MAX[goal_period]) }
          : weekly_goal
            ? { goalPeriod: "week" as const, goalTarget: weekly_goal }
            : {}),
      };
      await tx
        .insert(settings)
        .values({ userId, ...values })
        .onConflictDoUpdate({ target: settings.userId, set: values });
    }
  });

  return { applications: data.applications.length, history: history.length };
}
