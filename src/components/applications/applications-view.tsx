"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, Sparkles } from "lucide-react";

import { FiltersBar } from "@/components/applications/filters-bar";
import { Card, EmptyState, PageHeader } from "@/components/page-header";
import { QuickAddButton } from "@/components/quick-add/quick-add-button";
import { PriorityDot, SourceBadge, StatusBadge } from "@/components/status-badges";
import type { Application } from "@/db/schema";
import { useApplications } from "@/hooks/use-masar-data";
import { primaryName, secondaryName } from "@/lib/application-name";
import { applicationsPhrase } from "@/lib/arabic";
import { CLOSED_STATUSES, JOB_TYPE_LABELS, WORK_MODE_LABELS } from "@/lib/constants";
import { formatDate, formatShortDate, todayISO } from "@/lib/dates";
import { filterApplications, hasActiveFilters, type ApplicationFilters, type SortKey } from "@/lib/filters";
import { cn } from "@/lib/utils";
import { useFiltersStore } from "@/stores/ui-store";

function nextSort(filters: ApplicationFilters, key: SortKey): Pick<ApplicationFilters, "sort" | "dir"> {
  // Text columns start A→Z; dates and enums start with the "most" first.
  const firstDir = key === "job_title" || key === "company" ? "asc" : "desc";
  return { sort: key, dir: filters.sort === key ? (filters.dir === "asc" ? "desc" : "asc") : firstDir };
}

function SortHeader({
  label,
  sortKey,
  filters,
  className,
}: {
  label: string;
  sortKey: SortKey;
  filters: ApplicationFilters;
  className?: string;
}) {
  const setFilters = useFiltersStore((s) => s.setFilters);
  const active = filters.sort === sortKey;
  const Icon = !active ? ArrowUpDown : filters.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th
      scope="col"
      aria-sort={active ? (filters.dir === "asc" ? "ascending" : "descending") : "none"}
      className={cn("px-4 py-3 text-start font-medium", className)}
    >
      <button
        type="button"
        onClick={() => setFilters(nextSort(filters, sortKey))}
        className={cn("inline-flex cursor-pointer items-center gap-1.5 rounded-md hover:text-ink", active && "text-ink")}
      >
        {label}
        <Icon className="size-3.5" aria-hidden="true" />
      </button>
    </th>
  );
}

function FollowUpCell({ app, today }: { app: Application; today: string }) {
  if (!app.nextFollowUp || CLOSED_STATUSES.includes(app.status)) return <span className="text-ink-subtle">—</span>;
  const overdue = app.nextFollowUp < today;
  return (
    <span className={cn("whitespace-nowrap", overdue ? "font-semibold text-coral" : app.nextFollowUp === today && "font-semibold text-brand")}>
      {app.nextFollowUp === today ? "اليوم" : formatShortDate(app.nextFollowUp)}
    </span>
  );
}

export function ApplicationsView() {
  const filters = useFiltersStore((s) => s.filters);
  const active = hasActiveFilters(filters);
  const today = todayISO();
  const allApps = useApplications();
  const apps = useMemo(() => filterApplications(allApps, filters), [allApps, filters]);

  return (
    <>
      <PageHeader
        title="كل"
        highlight="طلباتك"
        description={
          apps.length > 0 ? `${active ? "النتائج" : "المجموع"}: ${applicationsPhrase(apps.length)}` : undefined
        }
      />
      <FiltersBar active={active} />

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
                  <SortHeader label="الوظيفة" sortKey="job_title" filters={filters} />
                  <th scope="col" className="px-4 py-3 text-start font-medium">
                    المصدر
                  </th>
                  <SortHeader label="الحالة" sortKey="status" filters={filters} />
                  <th scope="col" className="px-4 py-3 text-start font-medium">
                    النوع
                  </th>
                  <SortHeader label="تاريخ التقديم" sortKey="applied_date" filters={filters} />
                  <SortHeader label="الأولوية" sortKey="priority" filters={filters} />
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
                        {primaryName(app)}
                      </Link>
                      <div className="mt-0.5 flex items-center gap-1.5 truncate text-ink-muted">
                        {secondaryName(app)}
                        {app.location ? <span className="text-ink-subtle">· {app.location}</span> : null}
                        {app.cvTailored ? (
                          <Sparkles className="size-3.5 shrink-0 text-brand" aria-label="سيرة معدّلة" />
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
                      <p className="truncate font-semibold">{primaryName(app)}</p>
                      {secondaryName(app) ? (
                        <p className="truncate text-sm text-ink-muted">{secondaryName(app)}</p>
                      ) : null}
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
