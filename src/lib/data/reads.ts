import type { PostgrestError } from "@supabase/supabase-js";

import { DEFAULT_GOAL_PERIOD, DEFAULT_GOAL_TARGET } from "../constants";
import type { Goal } from "../goals";
import type { Supabase } from "../supabase/client";
import { toApplication, toStatusChange, type ApplicationRow, type SettingsRow, type StatusChangeRow } from "./rows";

// Reads for both the browser and the server prefetch. None of them filters by user: the
// row level security policies only ever return the caller's own rows.

export type UserSettings = { goal: Goal; displayName: string };

/** A failed Data API call. `code` is the Postgres or PostgREST error code. */
export class DataError extends Error {
  readonly code: string;
  constructor(error: PostgrestError) {
    super(error.message);
    this.code = error.code;
  }
}

type Page<T> = PromiseLike<{ data: T[] | null; error: PostgrestError | null; count: number | null }>;

/** The Data API caps every response (1000 rows by default), so long lists come in pages. */
async function selectAll<T>(page: (from: number, to: number) => Page<T>): Promise<T[]> {
  const rows: T[] = [];
  for (;;) {
    const { data, error, count } = await page(rows.length, rows.length + 999);
    if (error) throw new DataError(error);
    if (!data?.length) return rows;
    rows.push(...data);
    if (count !== null && rows.length >= count) return rows;
  }
}

export async function listApplications(supabase: Supabase) {
  const rows = await selectAll<ApplicationRow>((from, to) =>
    supabase
      .from("applications")
      .select("*", { count: "exact" })
      .order("applied_date", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to),
  );
  return rows.map(toApplication);
}

export async function listHistory(supabase: Supabase) {
  const rows = await selectAll<StatusChangeRow>((from, to) =>
    supabase
      .from("status_history")
      .select("*", { count: "exact" })
      .order("changed_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to),
  );
  return rows.map(toStatusChange);
}

/** Creates the user's settings row on their first visit. */
export async function getSettings(supabase: Supabase): Promise<UserSettings> {
  const { data, error } = await supabase
    .from("settings")
    .select("goal_period, goal_target, display_name")
    .maybeSingle<SettingsRow>();
  if (error) throw new DataError(error);
  if (!data) {
    const created = await supabase
      .from("settings")
      .upsert({ display_name: "" }, { onConflict: "user_id", ignoreDuplicates: true });
    if (created.error) throw new DataError(created.error);
  }
  return {
    goal: {
      period: data?.goal_period ?? DEFAULT_GOAL_PERIOD,
      target: data?.goal_target ?? DEFAULT_GOAL_TARGET,
    },
    displayName: data?.display_name ?? "",
  };
}

export async function getApplication(supabase: Supabase, id: number) {
  const { data, error } = await supabase.from("applications").select("*").eq("id", id).maybeSingle<ApplicationRow>();
  if (error) throw new DataError(error);
  return data ? toApplication(data) : null;
}

/** Another user's application is null too: the policies hide it. */
export async function getApplicationDetail(supabase: Supabase, id: number) {
  const [app, history] = await Promise.all([
    getApplication(supabase, id),
    supabase
      .from("status_history")
      .select("*")
      .eq("application_id", id)
      .order("changed_at", { ascending: true })
      .order("id", { ascending: true })
      .overrideTypes<StatusChangeRow[], { merge: false }>(),
  ]);
  if (history.error) throw new DataError(history.error);
  if (!app) return null;
  return { app, history: history.data.map(toStatusChange) };
}

export type ApplicationDetail = NonNullable<Awaited<ReturnType<typeof getApplicationDetail>>>;
