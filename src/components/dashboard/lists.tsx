import Link from "next/link";
import { CalendarClock, Lock } from "lucide-react";

import { FollowUpLink } from "@/components/applications/follow-up-link";
import { MarkGhostedButton } from "@/components/applications/mark-ghosted-button";
import { Card, CardTitle } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badges";
import type { Application } from "@/db/schema";
import { primaryName, secondaryName } from "@/lib/application-name";
import { daysPhrase, formatActivityTime } from "@/lib/dates";
import { STATUS_META, statusLabel } from "@/lib/constants";
import type { Badge } from "@/lib/metrics";
import type { ActivityItem } from "@/lib/metrics";
import { cn } from "@/lib/utils";

type FollowUp = { app: Application; overdueDays: number };

export function FollowUpsCard({
  followUps,
  stale,
  staleDays,
  className,
}: {
  followUps: FollowUp[];
  stale: Array<{ app: Application; days: number }>;
  staleDays: number;
  className?: string;
}) {
  return (
    <Card className={className} aria-labelledby="followups-title">
      <CardTitle
        id="followups-title"
        action={<CalendarClock className="size-5 text-ink-subtle" aria-hidden="true" />}
      >
        متابعات اليوم
      </CardTitle>

      {followUps.length === 0 ? (
        <p className="rounded-2xl bg-cream/70 px-4 py-5 text-sm text-ink-muted">
          ما عندك متابعات اليوم 👌 حدّد موعد متابعة لأي طلب ونذكّرك هنا.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {followUps.map(({ app, overdueDays }) => (
            <li key={app.id} className="flex items-center gap-2">
              <Link
                href={`/applications/${app.id}`}
                className="-ms-2 flex min-w-0 flex-1 items-center justify-between gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-cream/70"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{primaryName(app)}</span>
                  {secondaryName(app) ? (
                    <span className="block truncate text-sm text-ink-muted">{secondaryName(app)}</span>
                  ) : null}
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
                    overdueDays > 0 ? "bg-coral/10 text-coral" : "bg-brand-soft text-brand-deep",
                  )}
                >
                  {overdueDays > 0 ? `متأخرة ${daysPhrase(overdueDays)}` : "اليوم"}
                </span>
              </Link>
              {app.followUpUrl ? <FollowUpLink href={app.followUpUrl} size="sm" /> : null}
            </li>
          ))}
        </ul>
      )}

      {stale.length > 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-line p-4">
          <p className="text-sm font-semibold">ما ردّوا من {staleDays} يوم أو أكثر؟</p>
          <p className="mt-1 text-xs text-ink-muted">
            عادي يصير. علّمها «ما ردّوا» عشان تبقى لوحتك نظيفة وأرقامك صادقة.
          </p>
          <ul className="mt-3 space-y-2">
            {stale.map(({ app, days }) => (
              <li key={app.id} className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/applications/${app.id}`} className="min-w-0 text-sm hover:underline">
                  <span className="font-medium">{primaryName(app)}</span>
                  <span className="text-ink-muted">
                    {secondaryName(app) ? ` · ${secondaryName(app)}` : ""} · من {daysPhrase(days)}
                  </span>
                </Link>
                <MarkGhostedButton id={app.id} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}

export function ActivityCard({
  items,
  today,
  className,
}: {
  items: ActivityItem[];
  today: string;
  className?: string;
}) {
  return (
    <Card className={className} aria-labelledby="activity-title">
      <CardTitle id="activity-title">آخر النشاطات</CardTitle>
      {items.length === 0 ? (
        <p className="text-sm text-ink-muted">نشاطك بيظهر هنا أول ما تضيف طلب.</p>
      ) : (
        <ol className="space-y-4">
          {items.map((item) => (
            <li key={item.id} className="flex gap-3">
              <span
                aria-hidden="true"
                className="mt-1.5 size-2.5 shrink-0 rounded-full ring-4 ring-paper"
                style={{ background: STATUS_META[item.toStatus].color }}
              />
              <div className="min-w-0 text-sm">
                <p className="leading-relaxed">
                  {item.fromStatus === null ? "أضفت " : "نقلت "}
                  <Link href={`/applications/${item.applicationId}`} className="font-semibold hover:underline">
                    {primaryName(item)}
                  </Link>
                  {secondaryName(item) ? <span className="text-ink-muted"> في {secondaryName(item)}</span> : null}
                  {item.fromStatus === null ? (
                    <> بحالة «{statusLabel(item.toStatus, false)}»</>
                  ) : (
                    <>
                      {" "}
                      إلى <StatusBadge status={item.toStatus} className="ms-0.5 h-5 align-middle text-[11px]" />
                    </>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-ink-subtle">{formatActivityTime(item.changedAt, today)}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

const STICKER_TILT = ["rotate-[-3deg]", "rotate-[2deg]", "rotate-[-1.5deg]", "rotate-[3deg]", "rotate-[-2.5deg]", "rotate-[1.5deg]"];

export function BadgeSticker({ badge, index, className }: { badge: Badge; index: number; className?: string }) {
  return (
    <div
      className={cn(
        "sticker flex items-center gap-3 px-4 py-3",
        STICKER_TILT[index % STICKER_TILT.length],
        !badge.earned && "border-dashed bg-cream/60 shadow-none",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-xl text-xl",
          badge.earned ? "bg-brand-soft" : "bg-sand/80 grayscale",
        )}
      >
        {badge.earned ? badge.emoji : <Lock className="size-4 text-ink-subtle" />}
      </span>
      <span className="min-w-0">
        <span className={cn("block text-sm font-bold", !badge.earned && "text-ink-muted")}>{badge.label}</span>
        <span className="block text-xs text-ink-subtle">{badge.earned ? "حققته ✓" : badge.hint}</span>
      </span>
    </div>
  );
}

export function AchievementsCard({ badges }: { badges: Badge[] }) {
  const earned = badges.filter((b) => b.earned).length;
  return (
    <Card aria-labelledby="badges-title">
      <CardTitle
        id="badges-title"
        action={
          <span className="text-sm text-ink-muted">
            {earned} من {badges.length}
          </span>
        }
      >
        إنجازاتك
      </CardTitle>
      <ul className="grid grid-cols-1 gap-4 px-1 py-2 sm:grid-cols-2 lg:grid-cols-3">
        {badges.map((badge, i) => (
          <li key={badge.id}>
            <BadgeSticker badge={badge} index={i} />
          </li>
        ))}
      </ul>
    </Card>
  );
}
