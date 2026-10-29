import { createHash, timingSafeEqual } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { createSupabase } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

function sameSecret(a: string, b: string): boolean {
  const hash = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(hash(a), hash(b));
}

/**
 * Called every 5 days by Vercel Cron so the Supabase free tier never pauses for inactivity.
 * Vercel sends `Authorization: Bearer $CRON_SECRET` when that variable is set.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret || !sameSecret(header, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // A real read on a real table through the Data API, so Supabase counts it as activity.
  // No user here: keepalive() is the one function the anon role may call.
  const { data, error } = await createSupabase(async () => null).rpc("keepalive");
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 502 });
  }
  return NextResponse.json({ ok: true, rows: data, at: new Date().toISOString() });
}
