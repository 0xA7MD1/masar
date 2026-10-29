"use client";

import { Card, EmptyState, PageHeader } from "@/components/page-header";
import { QuickAddButton } from "@/components/quick-add/quick-add-button";
import { useApplications } from "@/hooks/use-masar-data";
import { todayISO } from "@/lib/dates";
import { daysWithoutUpdate, isStale } from "@/lib/metrics";

import { KanbanBoard, type BoardCard } from "./kanban-board";

export function BoardView() {
  const today = todayISO();
  const apps = useApplications();
  const cards: BoardCard[] = apps.map((app) => ({
    id: app.id,
    jobTitle: app.jobTitle,
    company: app.company,
    source: app.source,
    priority: app.priority,
    status: app.status,
    appliedDate: app.appliedDate,
    staleDays: isStale(app, today) ? daysWithoutUpdate(app, today) : null,
  }));

  return (
    <>
      <PageHeader
        title="لوحة"
        highlight="الطلبات"
        description="اسحب البطاقة لعمود جديد وتتحدّث حالتها فوراً — أو استخدم قائمة «نقل إلى» في كل بطاقة."
      />
      {cards.length === 0 ? (
        <Card>
          <EmptyState
            emoji="🗂️"
            title="اللوحة فاضية للحين"
            description="ما فيه طلبات للحين — ابدأ بأول طلب اليوم 🚀"
            action={<QuickAddButton>أضف أول طلب</QuickAddButton>}
          />
        </Card>
      ) : (
        <KanbanBoard cards={cards} today={today} />
      )}
    </>
  );
}
