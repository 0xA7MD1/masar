import type { PostgrestError } from "@supabase/supabase-js";

import type { Application } from "@/db/schema";

import { fail, ok, UNAUTHORIZED_MESSAGE, validationFail, type ActionResult } from "../action-result";
import { toImportPayload } from "../backup-payload";
import {
  rejectionEncouragement,
  snapshotCelebrations,
  statusCelebration,
  type MotivationFeedback,
} from "../celebrations";
import type { Status } from "../constants";
import { todayISO } from "../dates";
import { goalTargets, type GoalTargets } from "../goals";
import { isSubmitted, motivationSnapshot, type MotivationSnapshot } from "../metrics";
import type { Supabase } from "../supabase/client";
import { applicationSchema, backupSchema, idSchema, settingsSchema, statusSchema } from "../validation";
import { DataError, getApplication, getSettings, listApplications, listHistory } from "./reads";
import { toApplicationColumns } from "./rows";

// Writes, straight from the browser to the Data API. The policies decide whose rows they can
// touch; triggers write the status history and updated_at in the same transaction; the
// table's CHECK constraints back up the zod validation here, which a user could skip.

const NOT_FOUND = "ما لقينا هذا الطلب، يمكن انحذف.";
const SAVE_FAILED = "ما قدرنا نحفظ. تأكد من الاتصال وجرّب مرة ثانية.";

/** Postgres and PostgREST codes for a missing, expired or role-less token. */
const AUTH_CODES = new Set(["42501", "PGRST301", "PGRST302", "PGRST303"]);

function dataFail(error: unknown) {
  const code = error instanceof DataError ? error.code : (error as Partial<PostgrestError> | null)?.code;
  if (code && AUTH_CODES.has(code)) return fail(UNAUTHORIZED_MESSAGE);
  if (code === "23514") return fail("فيه قيمة ما تنقبل. راجع الحقول وجرّب مرة ثانية.");
  return fail(SAVE_FAILED);
}

/** Turns a thrown read or a network failure into the same `{ ok: false }` the forms show. */
async function guarded<T>(run: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await run();
  } catch (error) {
    return dataFail(error);
  }
}

async function loadState(supabase: Supabase, today: string) {
  const [apps, history] = await Promise.all([listApplications(supabase), listHistory(supabase)]);
  return { apps, snapshot: motivationSnapshot(apps, history, today) };
}

/** The state before a write and the goal targets, which celebrations compare against. */
async function loadBefore(supabase: Supabase, today: string) {
  const [{ snapshot }, { goal }] = await Promise.all([loadState(supabase, today), getSettings(supabase)]);
  return { before: snapshot, targets: goalTargets(goal, today) };
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

export function createApplication(
  supabase: Supabase,
  formData: FormData,
): Promise<ActionResult<{ id: number } & MotivationFeedback>> {
  return guarded(async () => {
    const parsed = applicationSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return validationFail(parsed.error);
    const values = parsed.data;

    const today = todayISO();
    const { before, targets } = await loadBefore(supabase, today);

    // The insert trigger writes the first history row.
    const { data, error } = await supabase
      .from("applications")
      .insert(toApplicationColumns({ ...values, appliedDate: values.appliedDate ?? today }))
      .select("id")
      .single<{ id: number }>();
    if (error) return dataFail(error);

    const after = await loadState(supabase, today);
    return ok({ id: data.id, ...statusFeedback({ id: data.id, ...values }, values.status, before, after, targets) });
  });
}

export function updateApplication(
  supabase: Supabase,
  id: number,
  formData: FormData,
): Promise<ActionResult<MotivationFeedback>> {
  return guarded(async () => {
    const parsedId = idSchema.safeParse(id);
    const parsed = applicationSchema.safeParse(Object.fromEntries(formData));
    if (!parsedId.success) return fail(NOT_FOUND);
    if (!parsed.success) return validationFail(parsed.error);

    const today = todayISO();
    const [existing, { before, targets }] = await Promise.all([
      getApplication(supabase, parsedId.data),
      loadBefore(supabase, today),
    ]);
    if (!existing) return fail(NOT_FOUND);

    const values = parsed.data;
    const { data, error } = await supabase
      .from("applications")
      .update(toApplicationColumns({ ...values, appliedDate: values.appliedDate ?? existing.appliedDate }))
      .eq("id", existing.id)
      .select("id");
    if (error) return dataFail(error);
    if (data.length === 0) return fail(NOT_FOUND);

    const after = await loadState(supabase, today);
    if (values.status === existing.status) {
      return ok({ celebrations: snapshotCelebrations(before, after.snapshot, targets) });
    }
    return ok(statusFeedback({ ...existing, ...values }, values.status, before, after, targets));
  });
}

/** Moves a bookmark into the pipeline as applied today; the optimistic update uses it too. */
export function appliedDateAfterMove(app: Pick<Application, "status" | "appliedDate">, to: Status, today: string) {
  return app.status === "saved" && to !== "saved" ? today : app.appliedDate;
}

export function updateApplicationStatus(
  supabase: Supabase,
  id: number,
  status: Status,
): Promise<ActionResult<MotivationFeedback>> {
  return guarded(async () => {
    const parsedId = idSchema.safeParse(id);
    const parsedStatus = statusSchema.safeParse(status);
    if (!parsedId.success) return fail(NOT_FOUND);
    if (!parsedStatus.success) return fail("حالة غير معروفة.");

    const today = todayISO();
    const [existing, { before, targets }] = await Promise.all([
      getApplication(supabase, parsedId.data),
      loadBefore(supabase, today),
    ]);
    if (!existing) return fail(NOT_FOUND);
    const to = parsedStatus.data;
    if (existing.status === to) return ok({ celebrations: [] });

    // The update trigger writes the history row.
    const { data, error } = await supabase
      .from("applications")
      .update({ status: to, applied_date: appliedDateAfterMove(existing, to, today) })
      .eq("id", existing.id)
      .select("id");
    if (error) return dataFail(error);
    if (data.length === 0) return fail(NOT_FOUND);

    const after = await loadState(supabase, today);
    return ok(statusFeedback(existing, to, before, after, targets));
  });
}

export function deleteApplication(supabase: Supabase, id: number): Promise<ActionResult> {
  return guarded(async () => {
    const parsedId = idSchema.safeParse(id);
    if (!parsedId.success) return fail(NOT_FOUND);

    // Status history goes with it through the foreign key's ON DELETE CASCADE.
    const { data, error } = await supabase.from("applications").delete().eq("id", parsedId.data).select("id");
    if (error) return dataFail(error);
    if (data.length === 0) return fail(NOT_FOUND);
    return ok(null);
  });
}

export function updateSettings(supabase: Supabase, formData: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return validationFail(parsed.error);

    const { displayName, goalPeriod, goalTarget } = parsed.data;
    const { error } = await supabase
      .from("settings")
      .upsert(
        { display_name: displayName, goal_period: goalPeriod, goal_target: goalTarget },
        { onConflict: "user_id" },
      );
    if (error) return dataFail(error);
    return ok(null);
  });
}

/** Replaces the signed-in user's data (and only theirs) with a JSON backup, in one transaction. */
export function importBackup(
  supabase: Supabase,
  data: unknown,
): Promise<ActionResult<{ applications: number; history: number }>> {
  return guarded(async () => {
    const parsed = backupSchema.safeParse(data);
    if (!parsed.success) {
      return fail("الملف مو نسخة احتياطية صالحة من مسار. تأكد إنه ملف JSON صدّرته من الإعدادات.");
    }
    const ids = new Set(parsed.data.applications.map((a) => a.id));
    if (ids.size !== parsed.data.applications.length) return fail("الملف فيه طلبات مكررة بنفس المعرّف.");

    const { data: counts, error } = await supabase.rpc("import_backup", { payload: toImportPayload(parsed.data) });
    if (error) return dataFail(error);
    return ok(counts as { applications: number; history: number });
  });
}
