// Two users, one database: proves the row level security policies, grants, triggers and
// functions keep each user to their own rows, exactly as the browser reaches them through
// the Supabase Data API. Runs on an in-memory Postgres (PGlite) with the real migrations,
// with Supabase's `anon` and `authenticated` roles and `auth.jwt()` stood in for.
//
//   pnpm test:isolation
import assert from "node:assert/strict";

import { PGlite, type Transaction } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

import { toImportPayload } from "../../src/lib/backup-payload";
import { backupSchema } from "../../src/lib/validation";

const ALICE = "user_isolation_alice";
const BOB = "user_isolation_bob";

let passed = 0;
async function check(name: string, fn: () => unknown) {
  await fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

async function main() {
  const pg = new PGlite();

  // What Supabase already has: the two API roles, and auth.jwt() reading the verified token's claims.
  await pg.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create function auth.jwt() returns jsonb language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
    $$;
    grant usage on schema auth to anon, authenticated;
  `);
  await migrate(drizzle(pg), { migrationsFolder: "./drizzle" });

  /** Runs `fn` the way PostgREST runs a request: one transaction, the caller's role and claims. */
  function as<T>(userId: string | null, fn: (tx: Transaction) => Promise<T>): Promise<T> {
    return pg.transaction(async (tx) => {
      const claims = userId ? JSON.stringify({ sub: userId, role: "authenticated" }) : "";
      await tx.query("select set_config('request.jwt.claims', $1, true)", [claims]);
      await tx.exec(`set local role ${userId ? "authenticated" : "anon"}`);
      return fn(tx);
    });
  }

  const ids = async (tx: Transaction, table: string) =>
    (await tx.query<{ id: number }>(`select id from ${table} order by id`)).rows.map((r) => r.id);

  const addApplication = (tx: Transaction, jobTitle: string, source = "linkedin") =>
    tx
      .query<{ id: number }>(
        "insert into applications (job_title, company, source, applied_date) values ($1, 'Co', $2, '2026-10-01') returning id",
        [jobTitle, source],
      )
      .then((r) => r.rows[0].id);

  console.log("Setting up: Alice adds 2 applications and her settings, Bob adds 1.");
  const [aliceId] = await as(ALICE, async (tx) => {
    const first = await addApplication(tx, "Alice Secret Job");
    await addApplication(tx, "Alice Second", "jadarat");
    await tx.query("insert into settings (display_name, goal_period, goal_target) values ('Alice', 'day', 3)");
    return [first];
  });
  const bobId = await as(BOB, (tx) => addApplication(tx, "Bob Job", "indeed"));

  console.log("Writes fill in the owner and the history:");
  await as(ALICE, async (tx) => {
    const rows = (await tx.query<{ user_id: string }>("select user_id from applications")).rows;
    await check("user_id comes from the token, not the client", () => assert.ok(rows.every((r) => r.user_id === ALICE)));
    const history = (await tx.query<{ from_status: string | null; to_status: string }>(
      "select from_status, to_status from status_history where application_id = $1",
      [aliceId],
    )).rows;
    await check("a new application gets one history row", () =>
      assert.deepEqual(history, [{ from_status: null, to_status: "applied" }]),
    );
  });

  console.log("Bob reads:");
  await as(BOB, async (tx) => {
    await check("sees only his own application", async () => assert.deepEqual(await ids(tx, "applications"), [bobId]));
    const history = (await tx.query<{ application_id: number }>("select application_id from status_history")).rows;
    await check("sees only his own status history", () => assert.deepEqual(history.map((h) => h.application_id), [bobId]));
    await check("sees no settings row (Alice's is hidden)", async () =>
      assert.equal((await tx.query("select * from settings")).rows.length, 0),
    );
    await check("cannot open Alice's application by id", async () =>
      assert.equal((await tx.query("select * from applications where id = $1", [aliceId])).rows.length, 0),
    );
  });

  console.log("Bob tries to change Alice's data:");
  const affected = (sql: string, params: unknown[] = []) =>
    as(BOB, async (tx) => (await tx.query(sql, params)).affectedRows ?? 0);
  await check("update matches nothing", async () =>
    assert.equal(await affected("update applications set job_title = 'Hacked' where id = $1", [aliceId]), 0),
  );
  await check("status change matches nothing", async () =>
    assert.equal(await affected("update applications set status = 'rejected' where id = $1", [aliceId]), 0),
  );
  await check("delete matches nothing", async () =>
    assert.equal(await affected("delete from applications where id = $1", [aliceId]), 0),
  );
  await check("settings update matches nothing", async () =>
    assert.equal(await affected("update settings set display_name = 'Hacked' where user_id = $1", [ALICE]), 0),
  );
  await check("cannot insert a row owned by Alice", () =>
    assert.rejects(as(BOB, (tx) =>
      tx.query("insert into applications (user_id, job_title, company, source, applied_date) values ($1, 'x', 'y', 'linkedin', '2026-10-01')", [ALICE]),
    )),
  );
  await check("cannot write Alice's settings", () =>
    assert.rejects(as(BOB, (tx) => tx.query("insert into settings (user_id, display_name) values ($1, 'Hacked')", [ALICE]))),
  );
  await check("cannot attach history to Alice's application", () =>
    assert.rejects(as(BOB, (tx) =>
      tx.query("insert into status_history (application_id, to_status) values ($1, 'offer')", [aliceId]),
    )),
  );
  await check("cannot write history under Alice's id", () =>
    assert.rejects(as(BOB, (tx) =>
      tx.query("insert into status_history (user_id, application_id, to_status) values ($1, $2, 'offer')", [ALICE, aliceId]),
    )),
  );
  await check("cannot hand his own row to Alice", () =>
    assert.rejects(as(BOB, (tx) => tx.query("update applications set user_id = $1 where id = $2", [ALICE, bobId]))),
  );
  await check("cannot change an id or created_at", async () => {
    await assert.rejects(as(BOB, (tx) => tx.query("update applications set id = 9999 where id = $1", [bobId])));
    await assert.rejects(as(BOB, (tx) => tx.query("update applications set created_at = now() where id = $1", [bobId])));
  });
  await check("cannot edit or delete history", async () => {
    await assert.rejects(as(BOB, (tx) => tx.query("update status_history set to_status = 'offer'")));
    await assert.rejects(as(BOB, (tx) => tx.query("delete from status_history")));
  });

  console.log("The table rejects bad values the browser might send:");
  for (const [name, sql] of [
    ["unknown source", "insert into applications (job_title, company, source, applied_date) values ('x', 'y', 'myspace', '2026-10-01')"],
    ["unknown status", "insert into applications (job_title, company, source, applied_date, status) values ('x', 'y', 'linkedin', '2026-10-01', 'hired')"],
    ["bad date", "insert into applications (job_title, company, source, applied_date) values ('x', 'y', 'linkedin', 'tomorrow')"],
    ["title over 160 characters", `insert into applications (job_title, company, source, applied_date) values ('${"x".repeat(161)}', 'y', 'linkedin', '2026-10-01')`],
    ["daily goal over 50", "insert into settings (goal_period, goal_target) values ('day', 51)"],
  ] as const) {
    await check(`refuses ${name}`, () => assert.rejects(as(BOB, (tx) => tx.query(sql))));
  }

  console.log("Bob changes his own application:");
  const before = await as(BOB, async (tx) =>
    (await tx.query<{ updated_at: Date }>("select updated_at from applications where id = $1", [bobId])).rows[0],
  );
  await as(BOB, (tx) => tx.query("update applications set status = 'interview' where id = $1", [bobId]));
  await as(BOB, async (tx) => {
    const row = (await tx.query<{ updated_at: Date }>("select updated_at from applications where id = $1", [bobId])).rows[0];
    await check("updated_at moves forward on its own", () => assert.ok(row.updated_at > before.updated_at));
    const history = (await tx.query<{ from_status: string; to_status: string }>(
      "select from_status, to_status from status_history where application_id = $1 order by id",
      [bobId],
    )).rows;
    await check("the status change adds a history row", () =>
      assert.deepEqual(history.at(-1), { from_status: "applied", to_status: "interview" }),
    );
    await tx.query("update applications set notes = 'just a note' where id = $1", [bobId]);
    const count = (await tx.query("select 1 from status_history where application_id = $1", [bobId])).rows.length;
    await check("an edit without a status change adds none", () => assert.equal(count, 2));
  });

  console.log("Bob restores a backup (replaces his data only):");
  const backup = backupSchema.parse({
    app: "masar",
    version: 1,
    settings: { weekly_goal: 7, display_name: "Bob" },
    applications: [1, 2].map((id) => ({
      id,
      created_at: "2026-09-01T08:00:00.000Z",
      updated_at: "2026-09-02T08:00:00.000Z",
      job_title: id === 1 ? "Bob Job" : "Bob Restored",
      company: "BobCo",
      source: "indeed",
      applied_date: "2026-09-01",
      status: "applied",
      cv_tailored: false,
      priority: "medium",
    })),
    status_history: [
      { id: 10, application_id: 1, to_status: "applied", changed_at: "2026-09-01T08:00:00.000Z" },
      { id: 11, application_id: 2, to_status: "applied", changed_at: "2026-09-01T08:00:00.000Z" },
      { id: 12, application_id: 404, to_status: "applied", changed_at: "2026-09-01T08:00:00.000Z" },
    ],
  });
  const result = await as(BOB, async (tx) =>
    (await tx.query<{ result: { applications: number; history: number } }>(
      "select import_backup($1::jsonb) as result",
      [JSON.stringify(toImportPayload(backup))],
    )).rows[0].result,
  );
  await check("import reports 2 applications and 2 history rows", () =>
    assert.deepEqual(result, { applications: 2, history: 2 }),
  );
  await as(BOB, async (tx) => {
    const apps = (await tx.query<{ id: number; job_title: string }>("select id, job_title from applications")).rows;
    await check("Bob now has exactly the 2 restored rows", () =>
      assert.deepEqual(apps.map((a) => a.job_title).sort(), ["Bob Job", "Bob Restored"]),
    );
    const history = (await tx.query<{ application_id: number }>("select application_id from status_history")).rows;
    await check("restored history points at his new rows, with no extra trigger rows", () => {
      const own = new Set(apps.map((a) => a.id));
      assert.equal(history.length, 2);
      assert.ok(history.every((h) => own.has(h.application_id)));
    });
    const settings = (await tx.query("select display_name, goal_period, goal_target from settings")).rows;
    await check("old weekly_goal backups become a weekly goal", () =>
      assert.deepEqual(settings, [{ display_name: "Bob", goal_period: "week", goal_target: 7 }]),
    );
  });

  console.log("Alice reads after all of that:");
  await as(ALICE, async (tx) => {
    const apps = (await tx.query<{ id: number; job_title: string; status: string }>(
      "select id, job_title, status from applications",
    )).rows;
    await check("still has both applications, untouched", () => {
      assert.deepEqual(apps.map((a) => a.job_title).sort(), ["Alice Second", "Alice Secret Job"]);
      assert.equal(apps.find((a) => a.id === aliceId)?.status, "applied");
    });
    const settings = (await tx.query<{ display_name: string }>("select display_name from settings")).rows;
    await check("keeps her own settings", () => assert.deepEqual(settings, [{ display_name: "Alice" }]));
    await check("sees only her own history", async () =>
      assert.equal((await tx.query("select 1 from status_history")).rows.length, 2),
    );
  });
  await as(ALICE, (tx) => tx.query("delete from applications where id = $1", [aliceId]));
  await check("deleting her application takes its history with it", async () =>
    assert.equal((await pg.query("select 1 from status_history where application_id = $1", [aliceId])).rows.length, 0),
  );

  console.log("Signed out (anon):");
  await check("cannot read any table", async () => {
    for (const table of ["applications", "status_history", "settings"]) {
      await assert.rejects(as(null, (tx) => tx.query(`select * from ${table}`)));
    }
  });
  await check("cannot insert", () =>
    assert.rejects(as(null, (tx) => addApplication(tx, "Anon"))),
  );
  await check("cannot run the backup import", () =>
    assert.rejects(as(null, (tx) => tx.query("select import_backup('{}'::jsonb)"))),
  );
  await check("can run the keep-alive read", async () => {
    const row = (await as(null, (tx) => tx.query<{ n: number }>("select keepalive() as n"))).rows[0];
    assert.equal(row.n, 1);
  });

  const total = await pg.query<{ user_id: string }>("select user_id from applications");
  await check("database holds 3 rows in total (1 Alice, 2 Bob)", () =>
    assert.deepEqual(total.rows.map((r) => r.user_id).sort(), [ALICE, BOB, BOB]),
  );

  await pg.close();
  console.log(`\nIsolation check passed: ${passed} checks.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
