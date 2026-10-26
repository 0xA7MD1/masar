import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { loginAttempts } from "@/db/schema";

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;

export type LockState = { locked: true; retryAfterMs: number } | { locked: false };

export async function getLockState(key: string, now = Date.now()): Promise<LockState> {
  const [row] = await getDb().select().from(loginAttempts).where(eq(loginAttempts.key, key));
  const lockedUntil = row?.lockedUntil?.getTime();
  if (lockedUntil && lockedUntil > now) {
    return { locked: true, retryAfterMs: lockedUntil - now };
  }
  return { locked: false };
}

/** Records a failed attempt and returns how many attempts are left before a lock. */
export async function registerFailure(key: string, now = Date.now()): Promise<number> {
  const db = getDb();
  const [row] = await db.select().from(loginAttempts).where(eq(loginAttempts.key, key));
  const windowExpired =
    !row ||
    now - row.windowStart.getTime() > WINDOW_MS ||
    (row.lockedUntil !== null && row.lockedUntil.getTime() <= now);
  const count = windowExpired ? 1 : row.count + 1;
  const values = {
    count,
    windowStart: windowExpired ? new Date(now) : row.windowStart,
    lockedUntil: count >= MAX_FAILURES ? new Date(now + LOCK_MS) : null,
  };

  await db
    .insert(loginAttempts)
    .values({ key, ...values })
    .onConflictDoUpdate({ target: loginAttempts.key, set: values });

  return Math.max(0, MAX_FAILURES - count);
}

export async function clearFailures(key: string): Promise<void> {
  await getDb().delete(loginAttempts).where(eq(loginAttempts.key, key));
}
