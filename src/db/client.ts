import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema";

const LOCAL_DATABASE_URL = "file:local.db";

export function resolveDatabaseUrl(): string {
  const url = process.env.TURSO_DATABASE_URL;
  if (url) return url;
  // Vercel's filesystem is ephemeral, so a local SQLite file would silently lose data there.
  if (process.env.VERCEL) {
    throw new Error("TURSO_DATABASE_URL is not set. Add it in the Vercel project settings.");
  }
  return LOCAL_DATABASE_URL;
}

export function createDb() {
  const client = createClient({
    url: resolveDatabaseUrl(),
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  });
  return { client, db: drizzle(client, { schema }) };
}

export type Db = ReturnType<typeof createDb>["db"];
