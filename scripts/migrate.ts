import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  const { createDb, resolveDatabaseUrl } = await import("../src/db/client");

  const { db, client } = createDb();
  console.log(`Running migrations against ${new URL(resolveDatabaseUrl()).host}…`);
  await migrate(db, { migrationsFolder: "./drizzle" });
  await client.end();
  console.log("Migrations complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
