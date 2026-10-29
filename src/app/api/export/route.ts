import { NextResponse, type NextRequest } from "next/server";

import { todayISO } from "@/lib/dates";
import { toBackup, toCsv } from "@/lib/export";
import { getSettings, listApplications, listHistory } from "@/lib/queries";
import { currentUserId } from "@/lib/user";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const format = request.nextUrl.searchParams.get("format") === "csv" ? "csv" : "json";
  const filename = `masar-${todayISO()}.${format}`;
  const headers = {
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store",
  };

  if (format === "csv") {
    const apps = await listApplications(userId);
    return new NextResponse(toCsv(apps), {
      headers: { ...headers, "Content-Type": "text/csv; charset=utf-8" },
    });
  }

  const [apps, history, settings] = await Promise.all([
    listApplications(userId),
    listHistory(userId),
    getSettings(userId),
  ]);
  return new NextResponse(JSON.stringify(toBackup(apps, history, settings), null, 2), {
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
  });
}
