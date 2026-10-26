import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, Sparkles } from "lucide-react";

import { FiltersBar } from "@/components/applications/filters-bar";
import { Card, EmptyState, PageHeader } from "@/components/page-header";
import { QuickAddButton } from "@/components/quick-add/quick-add-button";
import { PriorityDot, SourceBadge, StatusBadge } from "@/components/status-badges";
import type { Application } from "@/db/schema";
import { applicationsPhrase } from "@/lib/arabic";
import { CLOSED_STATUSES, JOB_TYPE_LABELS, WORK_MODE_LABELS } from "@/lib/constants";
import { formatDate, formatShortDate, todayISO } from "@/lib/dates";
import { hasActiveFilters, parseFilters, type ApplicationFilters, type SortKey } from "@/lib/filters";
import { searchApplications } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "الطلبات" };

type SearchParams = Record<string, string | string[] | undefined>;

function sortHref(params: SearchParams, filters: ApplicationFilters, key: SortKey): string {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === "string" && v) next.set(k, v);
  }
  const sameKey = filters.sort === key;
  next.set("sort", key);
  // Text columns start A→Z; dates and enums start with the "most" first.
  const firstDir = key === "job_title" || key === "company" ? "asc" : "desc";
  next.set("dir", sameKey ? (filters.dir === "asc" ? "desc" : "asc") : firstDir);
  return `/applications?${next.toString()}`;
}

function SortHeader({
  label,
  sortKey,
  params,
  filters,
  className,
}: {
  label: string;
  sortKey: SortKey;
  params: SearchParams;
  filters: ApplicationFilters;
  className?: string;
}) {
  const active = filters.sort === sortKey;
  const Icon = !active ? ArrowUpDown : filters.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th
      scope="col"
      aria-sort={active ? (filters.dir === "asc" ? "ascending" : "descending") : "none"}
      className={cn("px-4 py-3 text-start font-medium", className)}
    >
      <Link
        href={sortHref(params, filters, sortKey)}
        scroll={false}
        className={cn("inline-flex items-center gap-1.5 rounded-md hover:text-ink", active && "text-ink")}
      >
        {label}
        <Icon className="size-3.5" aria-hidden="true" />
      </Link>
    </th>
  );
}

function FollowUpCell({ app, today }: { app: Application; today: string }) {
  if (!app.nextFollowUp || CLOSED_STATUSES.includes(app.status)) return <span className="text-ink-subtle">—</span>;
  const overdue = app.nextFollowUp < today;
  return (
    <span className={cn("whitespace-nowrap", overdue ? "font-semibold text-coral" : app.nextFollowUp === today && "font-semibold text-teal")}>
      {app.nextFollowUp === today ? "اليوم" : formatShortDate(app.nextFollowUp)}
    </span>
  );
}

export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const active = hasActiveFilters(filters);
  const today = todayISO();
  const apps = await searchApplications(filters);

  return (
    <>
      <PageHeader
        title="كل"
        highlight="طلباتك"
        description={
          apps.length > 0 ? `${active ? "النتائج" : "المجموع"}: ${applicationsPhrase(apps.length)}` : undefined
        }
      />
      <FiltersBar filters={filters} active={active} />

      {apps.length === 0 ? (
        <Card>
          {active ? (
            <EmptyState emoji="🔍" title="ما لقينا شي يطابق" description="جرّب كلمة ثانية أو امسح بعض الفلاتر." />
          ) : (
            <EmptyState
              emoji="🚀"
              title="ما فيه طلبات للحين — ابدأ بأول طلب اليوم"
              action={<QuickAddButton>أضف أول طلب</QuickAddButton>}
            />
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden p-0 sm:p-0">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <caption className="sr-only">قائمة طلبات التوظيف</caption>
              <thead className="border-b border-line bg-cream/60 text-xs text-ink-muted">
                <tr>
                  <SortHeader label="الوظيفة" sortKey="job_title" params={params} filters={filters} />
                  <th scope="col" className="px-4 py-3 text-start font-medium">
                    المصدر
                  </th>
                  <SortHeader label="الحالة" sortKey="status" params={params} filters={filters} />
                  <th scope="col" className="px-4 py-3 text-start font-medium">
                    النوع
                  </th>
                  <SortHeader label="تاريخ التقديم" sortKey="applied_date" params={params} filters={filters} />
                  <SortHeader label="الأولوية" sortKey="priority" params={params} filters={filters} />
                  <th scope="col" className="px-4 py-3 text-start font-medium">
                    المتابعة
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {apps.map((app) => (
                  <tr key={app.id} className="transition-colors hover:bg-cream/50">
                    <td className="max-w-72 px-4 py-3.5">
                      <Link href={`/applications/${app.id}`} className="font-semibold hover:underline">
                        {app.jobTitle}
                      </Link>
                      <div className="mt-0.5 flex items-center gap-1.5 truncate text-ink-muted">
                        {app.company}
                        {app.location ? <span className="text-ink-subtle">· {app.location}</span> : null}
                        {app.cvTailored ? (
                          <Sparkles className="size-3.5 shrink-0 text-teal" aria-label="سيرة معدّلة" />
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <SourceBadge source={app.source} />
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-ink-muted">
                      {app.jobType ? JOB_TYPE_LABELS[app.jobType] : "—"}
                      {app.workMode ? <span className="text-ink-subtle"> · {WORK_MODE_LABELS[app.workMode]}</span> : null}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-ink-muted">{formatDate(app.appliedDate)}</td>
                    <td className="px-4 py-3.5">
                      <PriorityDot priority={app.priority} showLabel />
                    </td>
                    <td className="px-4 py-3.5">
                      <FollowUpCell app={app} today={today} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-line md:hidden">
            {apps.map((app) => (
              <li key={app.id}>
                <Link href={`/applications/${app.id}`} className="block px-4 py-4 active:bg-cream/60">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{app.jobTitle}</p>
                      <p className="truncate text-sm text-ink-muted">{app.company}</p>
                    </div>
                    <StatusBadge status={app.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-subtle">
                    <SourceBadge source={app.source} />
                    <PriorityDot priority={app.priority} />
                    <span>{formatDate(app.appliedDate)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
