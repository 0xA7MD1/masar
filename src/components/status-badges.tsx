import {
  PRIORITY_META,
  SOURCE_LABELS,
  STATUS_META,
  statusLabel,
  type Priority,
  type Source,
  type Status,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap",
        STATUS_META[status].badge,
        className,
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full" style={{ background: STATUS_META[status].color }} />
      {statusLabel(status)}
    </span>
  );
}

export function SourceBadge({ source, className }: { source: Source; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center rounded-full border border-line bg-cream/70 px-2.5 text-xs text-ink-muted whitespace-nowrap",
        className,
      )}
    >
      {SOURCE_LABELS[source]}
    </span>
  );
}

export function PriorityDot({ priority, showLabel = false }: { priority: Priority; showLabel?: boolean }) {
  const meta = PRIORITY_META[priority];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted" title={`الأولوية: ${meta.label}`}>
      <span aria-hidden="true" className="size-2 rounded-full" style={{ background: meta.color }} />
      <span className={showLabel ? undefined : "sr-only"}>
        {showLabel ? meta.label : `الأولوية ${meta.label}`}
      </span>
    </span>
  );
}
