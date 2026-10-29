// Two users, one database: proves neither can read or change the other's data through
// any server action, read action or the export route. Runs on an in-memory Postgres
// (PGlite) with the real migrations; Clerk's auth() is stubbed by ./register.mjs.
//
//   pnpm test:isolation
import assert from "node:assert/strict";

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { NextRequest } from "next/server";

import * as schema from "../../src/db/schema";

const ALICE = "user_isolation_alice";
const BOB = "user_isolation_bob";

const g = globalThis as unknown as { __isolationUserId?: string | null; __masarDb?: unknown };
const as = (userId: string | null) => {
  g.__isolationUserId = userId;
};

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

let passed = 0;
async function check(name: string, fn: () => unknown) {
  await fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

async function main() {
  const pg = new PGlite();
  const db = drizzle(pg, { schema });
  await migrate(db, { migrationsFolder: "./drizzle" });
  // src/db/index.ts reuses this cached instance instead of opening DATABASE_URL.
  g.__masarDb = db;

  const apps = await import("../../src/actions/applications");
  const settingsActions = await import("../../src/actions/settings");
  const data = await import("../../src/actions/data");
  const exportRoute = await import("../../src/app/api/export/route");
  const keepalive = await import("../../src/app/api/cron/keepalive/route");

  console.log("Setting up: Alice adds 2 applications, Bob adds 1.");
  as(ALICE);
  const a1 = await apps.createApplication(form({ jobTitle: "Alice Secret Job", company: "AliceCo", source: "linkedin" }));
  const a2 = await apps.createApplication(form({ jobTitle: "Alice Second", company: "AliceCo", source: "jadarat" }));
  assert.ok(a1.ok && a2.ok);
  const aliceId = a1.data.id;
  assert.ok((await settingsActions.updateSettings(form({ displayName: "Alice", goalPeriod: "day", goalTarget: "3" }))).ok);

  as(BOB);
  const b1 = await apps.createApplication(form({ jobTitle: "Bob Job", company: "BobCo", source: "indeed" }));
  assert.ok(b1.ok);
  const bobId = b1.data.id;

  console.log("Bob reads:");
  const bobApps = await data.fetchApplications();
  await check("sees only his own application", () => assert.deepEqual(bobApps.map((a) => a.id), [bobId]));
  const bobHistory = await data.fetchHistory();
  await check("sees only his own status history", () => assert.ok(bobHistory.every((h) => h.applicationId === bobId && h.userId === BOB)));
  const bobSettings = await data.fetchSettings();
  await check("gets his own default settings, not Alice's", () => assert.equal(bobSettings.displayName, ""));
  await check("cannot open Alice's application by id", async () => assert.equal(await data.fetchApplicationDetail(aliceId), null));

  console.log("Bob tries to change Alice's data:");
  const update = await apps.updateApplication(aliceId, form({ jobTitle: "Hacked", company: "X", source: "linkedin" }));
  await check("update is refused", () => assert.equal(update.ok, false));
  const move = await apps.updateApplicationStatus(aliceId, "rejected");
  await check("status change is refused", () => assert.equal(move.ok, false));
  const del = await apps.deleteApplication(aliceId);
  await check("delete is refused", () => assert.equal(del.ok, false));

  console.log("Bob exports:");
  as(BOB);
  const json = await (await exportRoute.GET(new NextRequest("http://localhost/api/export?format=json"))).text();
  await check("JSON backup has only his rows", () => {
    assert.ok(json.includes("Bob Job"));
    assert.ok(!json.includes("Alice"));
  });
  const csv = await (await exportRoute.GET(new NextRequest("http://localhost/api/export?format=csv"))).text();
  await check("CSV has only his rows", () => assert.ok(csv.includes("Bob Job") && !csv.includes("Alice")));

  console.log("Bob restores a backup (replaces his data only):");
  const backup = JSON.parse(json);
  backup.applications.push({ ...backup.applications[0], id: 999, job_title: "Bob Restored" });
  backup.status_history.push({ ...backup.status_history[0], id: 999, application_id: 999 });
  const restored = await settingsActions.importBackup(backup);
  await check("import succeeds", () => assert.ok(restored.ok && restored.data.applications === 2));
  const bobAfter = await data.fetchApplications();
  const bobHistoryAfter = await data.fetchHistory();
  await check("Bob now has exactly the 2 restored rows", () =>
    assert.deepEqual(bobAfter.map((a) => a.jobTitle).sort(), ["Bob Job", "Bob Restored"]),
  );
  await check("restored history points at Bob's new rows", () => {
    const ids = new Set(bobAfter.map((a) => a.id));
    assert.equal(bobHistoryAfter.length, 2);
    assert.ok(bobHistoryAfter.every((h) => ids.has(h.applicationId) && h.userId === BOB));
  });

  console.log("Alice reads after all of that:");
  as(ALICE);
  const aliceApps = await data.fetchApplications();
  await check("still has both applications, untouched", () => {
    assert.deepEqual(aliceApps.map((a) => a.jobTitle).sort(), ["Alice Second", "Alice Secret Job"]);
    assert.equal(aliceApps.find((a) => a.id === aliceId)?.status, "applied");
  });
  await check("sees none of Bob's rows", () => assert.ok(aliceApps.every((a) => a.userId === ALICE)));
  await check("keeps her own settings", async () => assert.equal((await data.fetchSettings()).displayName, "Alice"));
  const aliceHistory = await data.fetchHistory();
  await check("sees only her own history", () => assert.ok(aliceHistory.every((h) => h.userId === ALICE)));
  await check("cannot open Bob's application by id", async () => assert.equal(await data.fetchApplicationDetail(bobId), null));
  const own = await apps.updateApplicationStatus(aliceId, "interview");
  await check("can still change her own application", () => assert.ok(own.ok));

  console.log("Signed out:");
  as(null);
  await check("mutations are refused", async () => {
    assert.equal((await apps.createApplication(form({ jobTitle: "x", company: "y", source: "linkedin" }))).ok, false);
    assert.equal((await apps.deleteApplication(aliceId)).ok, false);
    assert.equal((await settingsActions.importBackup(backup)).ok, false);
  });
  await check("reads throw", () => assert.rejects(() => data.fetchApplications()));
  const anonymous = await exportRoute.GET(new NextRequest("http://localhost/api/export?format=json"));
  await check("export answers 401", () => assert.equal(anonymous.status, 401));

  console.log("Keepalive cron:");
  process.env.CRON_SECRET = "isolation-secret";
  const denied = await keepalive.GET(new NextRequest("http://localhost/api/cron/keepalive"));
  await check("refuses a request without the secret", () => assert.equal(denied.status, 401));
  const allowed = await keepalive.GET(
    new NextRequest("http://localhost/api/cron/keepalive", { headers: { authorization: "Bearer isolation-secret" } }),
  );
  await check("runs a real select with the secret", () => assert.equal(allowed.status, 200));

  const total = await db.select().from(schema.applications);
  await check("database has 4 rows in total (2 Alice, 2 Bob)", () => assert.equal(total.length, 4));

  await pg.close();
  console.log(`\nIsolation check passed: ${passed} checks.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
