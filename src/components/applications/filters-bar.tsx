"use client";

import { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

import { DatePicker } from "@/components/applications/form-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  JOB_TYPE_KEYS,
  JOB_TYPE_LABELS,
  SOURCE_KEYS,
  SOURCE_LABELS,
  STATUS_KEYS,
  statusLabel,
  type JobType,
  type Source,
  type Status,
} from "@/lib/constants";
import { useFiltersStore } from "@/stores/ui-store";

const ALL = "all";

function FilterSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string | undefined;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-ink-muted">
        {label}
      </Label>
      <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? undefined : v)}>
        <SelectTrigger id={id} size="sm" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectItem value={ALL}>الكل</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Filters live in a UI store and are applied to the cached list, so nothing waits on the server. */
export function FiltersBar({ active }: { active: boolean }) {
  const filters = useFiltersStore((s) => s.filters);
  const update = useFiltersStore((s) => s.setFilters);
  const clearFilters = useFiltersStore((s) => s.clearFilters);
  const searchRef = useRef<HTMLInputElement>(null);

  // "/" focuses the search box, like most list views.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (event.key !== "/" || target?.closest("input, textarea, select, [contenteditable]")) return;
      event.preventDefault();
      searchRef.current?.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <section aria-label="البحث والفلاتر" className="card-surface mb-6 p-4 sm:p-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="filter-q" className="text-xs text-ink-muted">
            بحث
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden="true" />
            <Input
              ref={searchRef}
              id="filter-q"
              type="search"
              value={filters.q ?? ""}
              onChange={(e) => update({ q: e.target.value || undefined })}
              placeholder="المسمى، الشركة، الموقع، الملاحظات…"
              className="h-9 ps-10"
              aria-keyshortcuts="/"
            />
          </div>
        </div>
        <FilterSelect
          id="filter-status"
          label="الحالة"
          value={filters.status}
          options={STATUS_KEYS.map((s) => ({ value: s, label: statusLabel(s) }))}
          onChange={(v) => update({ status: v as Status | undefined })}
        />
        <FilterSelect
          id="filter-source"
          label="المصدر"
          value={filters.source}
          options={SOURCE_KEYS.map((s) => ({ value: s, label: SOURCE_LABELS[s] }))}
          onChange={(v) => update({ source: v as Source | undefined })}
        />
        <FilterSelect
          id="filter-type"
          label="نوع الوظيفة"
          value={filters.jobType}
          options={JOB_TYPE_KEYS.map((t) => ({ value: t, label: JOB_TYPE_LABELS[t] }))}
          onChange={(v) => update({ jobType: v as JobType | undefined })}
        />
        <div className="space-y-1.5">
          <Label htmlFor="filter-from" className="text-xs text-ink-muted">
            من تاريخ
          </Label>
          <DatePicker
            id="filter-from"
            size="sm"
            clearable
            placeholder="أي تاريخ"
            value={filters.from ?? null}
            max={filters.to}
            onChange={(v) => update({ from: v ?? undefined })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filter-to" className="text-xs text-ink-muted">
            إلى تاريخ
          </Label>
          <DatePicker
            id="filter-to"
            size="sm"
            clearable
            placeholder="أي تاريخ"
            value={filters.to ?? null}
            min={filters.from}
            onChange={(v) => update({ to: v ?? undefined })}
          />
        </div>
        <div className="flex items-end justify-end">
          {active ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-9"
              onClick={clearFilters}
            >
              <X aria-hidden="true" />
              امسح الفلاتر
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
