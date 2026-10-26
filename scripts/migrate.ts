import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { migrate } = await import("drizzle-orm/libsql/migrator");
  const { createDb, resolveDatabaseUrl } = await import("../src/db/client");

  const url = resolveDatabaseUrl();
  const { db, client } = createDb();
  console.log(`Running migrations against ${url.startsWith("file:") ? url : new URL(url).host}…`);
  await migrate(db, { migrationsFolder: "./drizzle" });
  client.close();
  console.log("Migrations complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
