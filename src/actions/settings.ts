"use server";

import { getDb } from "@/db";
import { replaceUserData } from "@/db/replace-user-data";
import { settings } from "@/db/schema";
import { fail, ok, UNAUTHORIZED_MESSAGE, validationFail, type ActionResult } from "@/lib/action-result";
import { currentUserId } from "@/lib/user";
import { backupSchema, settingsSchema } from "@/lib/validation";

export async function updateSettings(formData: FormData): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return fail(UNAUTHORIZED_MESSAGE);

  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationFail(parsed.error);

  await getDb()
    .insert(settings)
    .values({ userId, ...parsed.data })
    .onConflictDoUpdate({ target: settings.userId, set: parsed.data });
  return ok(null);
}

/** Replaces the signed-in user's data (and only theirs) with a JSON backup. */
export async function importBackup(
  data: unknown,
): Promise<ActionResult<{ applications: number; history: number }>> {
  const userId = await currentUserId();
  if (!userId) return fail(UNAUTHORIZED_MESSAGE);

  const parsed = backupSchema.safeParse(data);
  if (!parsed.success) {
    return fail("الملف مو نسخة احتياطية صالحة من مسار. تأكد إنه ملف JSON صدّرته من الإعدادات.");
  }
  const ids = new Set(parsed.data.applications.map((a) => a.id));
  if (ids.size !== parsed.data.applications.length) return fail("الملف فيه طلبات مكررة بنفس المعرّف.");

  return ok(await replaceUserData(getDb(), userId, parsed.data));
}
