import {
  JOB_TYPE_KEYS,
  SOURCE_KEYS,
  STATUS_KEYS,
  type JobType,
  type Source,
  type Status,
} from "./constants";
import { ISO_DATE_RE } from "./dates";

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

type SearchParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const oneOf = <T extends string>(values: readonly T[], v: string | undefined): T | undefined =>
  values.includes(v as T) ? (v as T) : undefined;

export function parseFilters(params: SearchParams): ApplicationFilters {
  const date = (v: string | undefined) => (v && ISO_DATE_RE.test(v) ? v : undefined);
  const q = first(params.q)?.trim().slice(0, 100);
  return {
    q: q || undefined,
    status: oneOf(STATUS_KEYS, first(params.status)),
    source: oneOf(SOURCE_KEYS, first(params.source)),
    jobType: oneOf(JOB_TYPE_KEYS, first(params.type)),
    from: date(first(params.from)),
    to: date(first(params.to)),
    sort: oneOf(SORT_KEYS, first(params.sort)) ?? "applied_date",
    dir: first(params.dir) === "asc" ? "asc" : "desc",
  };
}

export function hasActiveFilters(f: ApplicationFilters): boolean {
  return Boolean(f.q || f.status || f.source || f.jobType || f.from || f.to);
}
