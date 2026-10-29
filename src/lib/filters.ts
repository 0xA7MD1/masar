import type { Application } from "@/db/schema";

import { PRIORITY_KEYS, STATUS_KEYS, type JobType, type Source, type Status } from "./constants";

export const SORT_KEYS = ["applied_date", "job_title", "company", "status", "priority", "updated_at"] as const;
export type SortKey = (typeof SORT_KEYS)[number];
export type SortDir = "asc" | "desc";

export type ApplicationFilters = {
  q?: string;
  status?: Status;
  source?: Source;
  jobType?: JobType;
  from?: string;
  to?: string;
  sort: SortKey;
  dir: SortDir;
};

export const DEFAULT_FILTERS: ApplicationFilters = { sort: "applied_date", dir: "desc" };

export function hasActiveFilters(f: ApplicationFilters): boolean {
  return Boolean(f.q?.trim() || f.status || f.source || f.jobType || f.from || f.to);
}

const compareText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

function compareBy(sort: SortKey, a: Application, b: Application): number {
  switch (sort) {
    case "job_title":
      return compareText(a.jobTitle, b.jobTitle);
    case "company":
      return compareText(a.company, b.company);
    case "status":
      return STATUS_KEYS.indexOf(a.status) - STATUS_KEYS.indexOf(b.status);
    case "priority":
      return PRIORITY_KEYS.indexOf(a.priority) - PRIORITY_KEYS.indexOf(b.priority);
    case "updated_at":
      return a.updatedAt.getTime() - b.updatedAt.getTime();
    default:
      return compareText(a.appliedDate, b.appliedDate);
  }
}

/** Search, filter and sort the cached list in the browser, so typing never waits on the server. */
export function filterApplications(apps: Application[], f: ApplicationFilters): Application[] {
  const needle = f.q?.trim().slice(0, 100).toLowerCase();
  const contains = (value: string | null) => (value ?? "").toLowerCase().includes(needle!);
  const sign = f.dir === "asc" ? 1 : -1;

  return apps
    .filter(
      (app) =>
        (!needle || contains(app.jobTitle) || contains(app.company) || contains(app.location) || contains(app.notes)) &&
        (!f.status || app.status === f.status) &&
        (!f.source || app.source === f.source) &&
        (!f.jobType || app.jobType === f.jobType) &&
        (!f.from || app.appliedDate >= f.from) &&
        (!f.to || app.appliedDate <= f.to),
    )
    .sort((a, b) => sign * compareBy(f.sort, a, b) || b.id - a.id);
}
