import { NextResponse, type NextRequest } from "next/server";

import { todayISO } from "@/lib/dates";
import { getSettings, listApplications, listHistory } from "@/lib/data/reads";
import { toBackup, toCsv } from "@/lib/export";
import { createServerSupabase } from "@/lib/supabase/server";
import { currentUserId } from "@/lib/user";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await currentUserId())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Reads as the signed-in user, so the policies limit the file to their own rows.
  const supabase = await createServerSupabase();

  const format = request.nextUrl.searchParams.get("format") === "csv" ? "csv" : "json";
  const filename = `masar-${todayISO()}.${format}`;
  const headers = {
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store",
  };

  if (format === "csv") {
    const apps = await listApplications(supabase);
    return new NextResponse(toCsv(apps), {
      headers: { ...headers, "Content-Type": "text/csv; charset=utf-8" },
    });
  }

  const [apps, history, settings] = await Promise.all([
    listApplications(supabase),
    listHistory(supabase),
    getSettings(supabase),
  ]);
  return new NextResponse(JSON.stringify(toBackup(apps, history, settings), null, 2), {
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
  });
}
