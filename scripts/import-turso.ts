// Copies the old single-user Turso database into Supabase under one Clerk user.
// Turso is only read, never written. Dry run by default; pass --write to import.
//
//   pnpm db:import-turso --user user_xxx            # dry run: counts only
//   pnpm db:import-turso --user user_xxx --write    # import
//   ... --write --replace                           # also when that user already has data
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

type Row = Record<string, unknown>;

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

const text = (v: unknown) => (v === null || v === undefined ? null : String(v));

async function readTurso() {
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) throw new Error("TURSO_DATABASE_URL is not set.");
  const { createClient } = await import("@libsql/client");
  const turso = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || undefined });
  try {
    const [apps, history, settings] = await Promise.all([
      turso.execute("select * from applications order by id"),
      turso.execute("select * from status_history order by id"),
      turso.execute("select * from settings where id = 1"),
    ]);
    return { host: new URL(url).host, apps: apps.rows as Row[], history: history.rows as Row[], settings: settings.rows[0] as Row | undefined };
  } finally {
    turso.close();
  }
}

async function main() {
  const userId = argValue("--user");
  if (!userId?.startsWith("user_")) {
    console.error("Usage: pnpm db:import-turso --user <clerk user id, starts with user_> [--write] [--replace]");
    process.exit(1);
  }
  const write = process.argv.includes("--write");

  const { count, eq } = await import("drizzle-orm");
  const { createDb } = await import("../src/db/client");
  const { replaceUserData } = await import("../src/db/replace-user-data");
  const { applications, statusHistory } = await import("../src/db/schema");
  const { backupSchema } = await import("../src/lib/validation");

  const source = await readTurso();
  // Same shape as a JSON backup, so the backup validation checks every row.
  const parsed = backupSchema.safeParse({
    app: "masar",
    version: 1,
    settings: source.settings
      ? {
          goal_period: text(source.settings.goal_period) ?? undefined,
          goal_target: source.settings.goal_target === undefined ? undefined : Number(source.settings.goal_target),
          weekly_goal: source.settings.weekly_goal === undefined ? undefined : Number(source.settings.weekly_goal),
          display_name: text(source.settings.display_name) ?? "",
        }
      : null,
    applications: source.apps.map((a) => ({
      id: Number(a.id),
      created_at: Number(a.created_at),
      updated_at: Number(a.updated_at),
      job_title: text(a.job_title) ?? "",
      company: text(a.company) ?? "",
      source: a.source,
      job_type: text(a.job_type),
      work_mode: text(a.work_mode),
      location: text(a.location),
      job_url: text(a.job_url),
      applied_date: a.applied_date,
      status: a.status,
      expected_salary: text(a.expected_salary),
      cv_tailored: Number(a.cv_tailored) === 1,
      next_follow_up: text(a.next_follow_up),
      priority: a.priority,
      notes: text(a.notes),
      follow_up_url: text(a.follow_up_url),
    })),
    status_history: source.history.map((h) => ({
      id: Number(h.id),
      application_id: Number(h.application_id),
      from_status: text(h.from_status),
      to_status: h.to_status,
      changed_at: Number(h.changed_at),
    })),
  });
  if (!parsed.success) {
    console.error("Turso rows failed validation:", JSON.stringify(parsed.error.issues.slice(0, 10), null, 2));
    process.exit(1);
  }
  const data = parsed.data;
  console.log(
    `Turso (${source.host}): ${data.applications.length} applications, ${data.status_history.length} status changes, settings: ${data.settings ? "yes" : "no"}.`,
  );

  const { db, client } = createDb();
  try {
    const countFor = async () => {
      const [apps] = await db.select({ n: count() }).from(applications).where(eq(applications.userId, userId));
      const [history] = await db.select({ n: count() }).from(statusHistory).where(eq(statusHistory.userId, userId));
      return { apps: apps.n, history: history.n };
    };

    const existing = await countFor();
    console.log(`Supabase, ${userId} has: ${existing.apps} applications, ${existing.history} status changes.`);
    if (existing.apps > 0 && !process.argv.includes("--replace")) {
      console.error("That user already has data in Supabase. Add --replace to overwrite it.");
      process.exitCode = 1;
      return;
    }
    if (!write) {
      console.log("Dry run, nothing written. Add --write to import.");
      return;
    }

    const result = await replaceUserData(db, userId, data);
    const after = await countFor();
    console.log(`Imported ${result.applications} applications and ${result.history} status changes.`);
    console.log(`Supabase, ${userId} now has: ${after.apps} applications, ${after.history} status changes.`);
    if (after.apps !== data.applications.length) throw new Error("Row count mismatch after import.");
    console.log("Turso was not changed. Check the app, then retire Turso.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
