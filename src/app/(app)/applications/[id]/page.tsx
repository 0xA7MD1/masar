import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ExternalLink, Ghost } from "lucide-react";

import { ApplicationEditForm } from "@/components/applications/application-edit-form";
import { MarkGhostedButton } from "@/components/applications/mark-ghosted-button";
import { Card, CardTitle } from "@/components/page-header";
import { SourceBadge, StatusBadge } from "@/components/status-badges";
import { STALE_AFTER_DAYS, STATUS_META, statusLabel } from "@/lib/constants";
import { daysPhrase, diffDays, formatDate, formatDateTime, todayISO } from "@/lib/dates";
import { daysWithoutUpdate, isStale } from "@/lib/metrics";
import { getApplication, getApplicationHistory } from "@/lib/queries";
import { idSchema } from "@/lib/validation";

type Props = { params: Promise<{ id: string }> };

async function load(rawId: string) {
  const parsed = idSchema.safeParse(rawId);
  if (!parsed.success) notFound();
  const app = await getApplication(parsed.data);
  if (!app) notFound();
  return app;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const app = await load(id);
  return { title: `${app.jobTitle} — ${app.company}` };
}

export default async function ApplicationPage({ params }: Props) {
  const { id } = await params;
  const app = await load(id);
  const history = await getApplicationHistory(app.id);
  const today = todayISO();
  const stale = isStale(app, today);
  const age = diffDays(today, app.appliedDate);

  return (
    <div className="space-y-6">
      <Link
        href="/applications"
        className="inline-flex items-center gap-1.5 rounded-full text-sm text-ink-muted hover:text-ink"
      >
        <ArrowRight className="size-4" aria-hidden="true" />
        كل الطلبات
      </Link>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={app.status} />
            <SourceBadge source={app.source} />
          </div>
          <h1 className="display text-4xl break-words sm:text-5xl">{app.jobTitle}</h1>
          <p className="mt-2 text-lg text-ink-muted">
            <span className="font-semibold text-teal">{app.company}</span>
            {app.location ? <> · {app.location}</> : null}
          </p>
          <p className="mt-1 text-sm text-ink-subtle">
            قدّمت في {formatDate(app.appliedDate)}
            {age > 0 ? ` (قبل ${daysPhrase(age)})` : age === 0 ? " (اليوم)" : null}
          </p>
        </div>
        {app.jobUrl ? (
          <a
            href={app.jobUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 shrink-0 items-center gap-2 self-start rounded-full border border-line bg-paper/70 px-5 text-sm font-medium hover:bg-paper sm:self-auto"
          >
            إعلان الوظيفة
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        ) : null}
      </header>

      {stale ? (
        <div
          role="note"
          className="flex flex-col gap-3 rounded-[20px] border border-dashed border-line bg-paper/70 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="flex items-center gap-2 text-sm text-ink-muted">
            <Ghost className="size-4 shrink-0" aria-hidden="true" />
            مرّ {daysPhrase(daysWithoutUpdate(app, today))} بدون أي تحديث (أكثر من {STALE_AFTER_DAYS} يوم). تبي تعلّمه «ما ردّوا»؟
          </p>
          <MarkGhostedButton id={app.id} />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card aria-labelledby="details-title">
          <CardTitle id="details-title">التفاصيل</CardTitle>
          <ApplicationEditForm
            key={app.updatedAt.getTime()}
            id={app.id}
            defaults={{
              jobTitle: app.jobTitle,
              company: app.company,
              source: app.source,
              jobType: app.jobType,
              workMode: app.workMode,
              location: app.location,
              jobUrl: app.jobUrl,
              appliedDate: app.appliedDate,
              status: app.status,
              expectedSalary: app.expectedSalary,
              cvTailored: app.cvTailored,
              nextFollowUp: app.nextFollowUp,
              priority: app.priority,
              notes: app.notes,
            }}
          />
        </Card>

        <Card aria-labelledby="timeline-title" className="h-fit lg:sticky lg:top-24">
          <CardTitle id="timeline-title">رحلة الطلب</CardTitle>
          {history.length === 0 ? (
            <p className="text-sm text-ink-muted">ما فيه تغييرات مسجّلة.</p>
          ) : (
            <ol className="relative space-y-6 before:absolute before:inset-y-2 before:start-[5px] before:w-px before:bg-line">
              {[...history].reverse().map((entry, i) => (
                <li key={entry.id} className="relative ps-7">
                  <span
                    aria-hidden="true"
                    className="absolute start-0 top-1.5 size-[11px] rounded-full ring-4 ring-paper"
                    style={{ background: STATUS_META[entry.toStatus].color }}
                  />
                  <p className={i === 0 ? "font-bold" : "font-medium"}>{statusLabel(entry.toStatus)}</p>
                  <p className="mt-0.5 text-xs text-ink-subtle">
                    {entry.fromStatus === null ? "أول ما انضاف" : `من «${statusLabel(entry.fromStatus, false)}»`}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-subtle">{formatDateTime(entry.changedAt)}</p>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}
