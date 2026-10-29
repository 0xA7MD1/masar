import { createHash, timingSafeEqual } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { getDb } from "@/db";
import { settings } from "@/db/schema";

export const dynamic = "force-dynamic";

function sameSecret(a: string, b: string): boolean {
  const hash = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(hash(a), hash(b));
}

/**
 * Called once a day by Vercel Cron so the Supabase free tier never pauses for inactivity.
 * Vercel sends `Authorization: Bearer $CRON_SECRET` when that variable is set.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret || !sameSecret(header, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // A real read on a real table, so the database counts it as activity.
  const rows = await getDb().select({ userId: settings.userId }).from(settings).limit(1);
  return NextResponse.json({ ok: true, rows: rows.length, at: new Date().toISOString() });
}
