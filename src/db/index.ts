import "server-only";

import { createDb, type Db } from "./client";

const globalForDb = globalThis as unknown as { __masarDb?: Db };

/** Lazily created so builds without database env vars never open a connection. */
export function getDb(): Db {
  if (!globalForDb.__masarDb) {
    globalForDb.__masarDb = createDb().db;
  }
  return globalForDb.__masarDb;
}

export * as schema from "./schema";
