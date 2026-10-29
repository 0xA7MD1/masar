import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Use the Supabase transaction pooler URL (port 6543).");
  }
  return url;
}

export function createDb(url = resolveDatabaseUrl()) {
  // The Supabase transaction pooler does not support prepared statements.
  const client = postgres(url, { prepare: false });
  return { client, db: drizzle(client, { schema }) };
}

export type Db = ReturnType<typeof createDb>["db"];
