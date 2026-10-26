import Link from "next/link";
import { Flame } from "lucide-react";

import { Heatmap } from "@/components/dashboard/heatmap";
import { StreakCard, QualityCard, WeeklyGoalCard } from "@/components/dashboard/goal-cards";
import { AchievementsCard, ActivityCard, BadgeSticker, FollowUpsCard } from "@/components/dashboard/lists";
import { StatsStrip } from "@/components/dashboard/stats-strip";
import { Card, CardTitle, EmptyState } from "@/components/page-header";
import { QuickAddButton } from "@/components/quick-add/quick-add-button";
import { Button } from "@/components/ui/button";
import { applicationsPhrase, streakPhrase } from "@/lib/arabic";
import { STALE_AFTER_DAYS } from "@/lib/constants";
import { formatDate, hourInAppTimeZone, todayISO, WEEKDAYS, weekdayIndex } from "@/lib/dates";
import {
  activityByDay,
  computeBadges,
  computeFunnel,
  computeStreaks,
  cvQuality,
  daysWithoutUpdate,
  dueFollowUps,
  groupHistory,
  heatmap,
  isStale,
  weekDays,
} from "@/lib/metrics";
import { dailyLine, greeting } from "@/lib/motivation";
import { getRecentActivity, getSettings, listApplications, listHistory } from "@/lib/queries";

export default async function DashboardPage() {
  const today = todayISO();
  const [apps, history, settings, activity] = await Promise.all([
    listApplications(),
    listHistory(),
    getSettings(),
    getRecentActivity(8),
  ]);

  const days = activityByDay(apps, today);
  const streaks = computeStreaks(days, today);
  const week = weekDays(days, today);
  const thisWeek = week.reduce((sum, d) => sum + d.count, 0);
  const funnel = computeFunnel(apps, groupHistory(history));
  const quality = cvQuality(apps);
  const heat = heatmap(days, today, 26);
  const followUps = dueFollowUps(apps, today);
  const stale = apps
    .filter((app) => isStale(app, today))
    .map((app) => ({ app, days: daysWithoutUpdate(app, today) }));
  const badges = computeBadges({
    submitted: funnel.submitted,
    interviews: funnel.interviews,
    offers: funnel.offers,
    bestStreak: streaks.best,
  });
  const earnedBadges = badges.filter((b) => b.earned);
  const name = settings.displayName.trim();

  return (
    <div className="space-y-6 md:space-y-8">
      <section className="relative grid gap-8 pb-2 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="animate-rise-in">
          <p className="text-sm text-ink-subtle">
            {WEEKDAYS[weekdayIndex(today)]}، {formatDate(today)}
          </p>
          <h1 className="display mt-3 text-5xl sm:text-6xl md:text-7xl">
            {greeting(hourInAppTimeZone())}
            {name ? (
              <>
                ، <span className="text-brand">{name}</span>
              </>
            ) : (
              <span className="text-brand"> 👋</span>
            )}
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-muted">{dailyLine(today)}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <QuickAddButton />
            <Button asChild variant="outline" size="lg">
              <Link href="/board">افتح اللوحة</Link>
            </Button>
          </div>
        </div>

        {/* Floating stickers echo the latest wins; decorative on large screens only. */}
        <div aria-hidden="true" className="relative hidden h-56 w-80 lg:block">
          <div className="sticker animate-float-soft absolute top-2 end-4 flex rotate-[-6deg] items-center gap-2 px-4 py-3">
            <Flame className={streaks.current > 0 ? "size-5 fill-coral text-coral" : "size-5 text-ink-subtle"} />
            <span className="text-sm font-bold">
              {streaks.current > 0 ? streakPhrase(streaks.current) : "ابدأ سلسلتك اليوم"}
            </span>
          </div>
          {earnedBadges.slice(-2).map((badge, i) => (
            <div
              key={badge.id}
              className={
                i === 0
                  ? "animate-float-soft absolute top-24 start-0 w-52 [animation-delay:1.2s]"
                  : "animate-float-soft absolute bottom-0 end-10 w-52 [animation-delay:2.4s]"
              }
            >
              <BadgeSticker badge={badge} index={i + 1} />
            </div>
          ))}
        </div>
      </section>

      {apps.length === 0 ? (
        <Card>
          <EmptyState
            emoji="🚀"
            title="ما فيه طلبات للحين — ابدأ بأول طلب اليوم"
            description="سجّل الوظيفة اللي قدّمت عليها بأقل من 30 ثانية، وخل مسار يتابع معك الباقي."
            action={<QuickAddButton>أضف أول طلب</QuickAddButton>}
          />
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3 md:gap-6">
        <WeeklyGoalCard count={thisWeek} goal={settings.weeklyGoal} days={week} />
        <StreakCard current={streaks.current} best={streaks.best} activeToday={streaks.activeToday} />
        <QualityCard percent={quality.percent} tailored={quality.tailored} total={quality.total} />
      </div>

      <StatsStrip
        items={[
          { label: "إجمالي الطلبات", value: funnel.submitted, note: `${thisWeek} هذا الأسبوع` },
          {
            label: "نسبة الرد",
            value: funnel.responseRate,
            suffix: "%",
            note: `${funnel.responded} من ${funnel.submitted} ردّوا`,
          },
          { label: "المقابلات", value: funnel.interviews, note: "وصلت لمرحلة المقابلة" },
          { label: "العروض", value: funnel.offers, note: funnel.offers > 0 ? "تعبك جاب نتيجة ✨" : "جايك قريب" },
        ]}
      />

      <Card aria-labelledby="heatmap-title">
        <CardTitle
          id="heatmap-title"
          action={<span className="text-sm text-ink-muted">{applicationsPhrase(heat.total)} في آخر 6 أشهر</span>}
        >
          نشاطك
        </CardTitle>
        <Heatmap columns={heat.columns} months={heat.months} total={heat.total} />
      </Card>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-5">
        <FollowUpsCard
          className="lg:col-span-3"
          followUps={followUps}
          stale={stale}
          staleDays={STALE_AFTER_DAYS}
        />
        <ActivityCard className="lg:col-span-2" items={activity} today={today} />
      </div>

      <AchievementsCard badges={badges} />
    </div>
  );
}
