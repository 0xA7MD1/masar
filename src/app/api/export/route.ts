import { NextResponse, type NextRequest } from "next/server";

import { isAuthenticated } from "@/lib/auth/server";
import { todayISO } from "@/lib/dates";
import { toBackup, toCsv } from "@/lib/export";
import { getSettings, listApplications, listHistory } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const format = request.nextUrl.searchParams.get("format") === "csv" ? "csv" : "json";
  const filename = `masar-${todayISO()}.${format}`;
  const headers = {
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store",
  };

  if (format === "csv") {
    const apps = await listApplications();
    return new NextResponse(toCsv(apps), {
      headers: { ...headers, "Content-Type": "text/csv; charset=utf-8" },
    });
  }

  const [apps, history, settings] = await Promise.all([listApplications(), listHistory(), getSettings()]);
  return new NextResponse(JSON.stringify(toBackup(apps, history, settings), null, 2), {
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
  });
}
