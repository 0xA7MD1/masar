"use client";

import { useCallback, useMemo, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Ellipsis, Ghost } from "lucide-react";
import { toast } from "sonner";

import { updateApplicationStatus } from "@/actions/applications";
import { useCelebrate } from "@/components/celebrate/celebration-provider";
import { ScrollToEnd } from "@/components/scroll-to-end";
import { PriorityDot, SourceBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { STATUS_KEYS, STATUS_META, statusLabel, type Priority, type Source, type Status } from "@/lib/constants";
import { daysPhrase, relativeDays } from "@/lib/dates";
import { cn } from "@/lib/utils";

export type BoardCard = {
  id: number;
  jobTitle: string;
  company: string;
  source: Source;
  priority: Priority;
  status: Status;
  appliedDate: string;
  staleDays: number | null;
};

type Move = { id: number; status: Status };

// Columns are laid out in an LTR scroller in reverse order so the pipeline still
// reads right-to-left while dnd-kit's auto-scroll gets the positive scrollLeft it expects.
const COLUMN_ORDER = [...STATUS_KEYS].reverse();

export function KanbanBoard({ cards, today }: { cards: BoardCard[]; today: string }) {
  const celebrate = useCelebrate();
  const [, startTransition] = useTransition();
  const [optimisticCards, applyMove] = useOptimistic(cards, (state: BoardCard[], move: Move) =>
    state.map((card) => (card.id === move.id ? { ...card, status: move.status } : card)),
  );
  const [activeId, setActiveId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Long-press on touch so horizontal swiping still scrolls the board.
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
  );

  const byId = useMemo(() => new Map(optimisticCards.map((c) => [c.id, c])), [optimisticCards]);

  const move = useCallback(
    (id: number, status: Status) => {
      const card = byId.get(id);
      if (!card || card.status === status) return;
      startTransition(async () => {
        applyMove({ id, status });
        const result = await updateApplicationStatus(id, status);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        celebrate(result.data);
      });
    },
    [byId, applyMove, celebrate],
  );

  const announcements: Announcements = {
    onDragStart: ({ active }) => `مسكت «${byId.get(Number(active.id))?.jobTitle ?? ""}».`,
    onDragOver: ({ over }) => (over ? `فوق عمود ${statusLabel(over.id as Status, false)}.` : "برا الأعمدة."),
    onDragEnd: ({ over }) =>
      over ? `انتقل إلى ${statusLabel(over.id as Status, false)}.` : "رجعت البطاقة لمكانها.",
    onDragCancel: () => "انلغى السحب.",
  };

  function onDragStart(event: DragStartEvent) {
    setActiveId(Number(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    if (event.over) move(Number(event.active.id), event.over.id as Status);
  }

  const activeCard = activeId === null ? undefined : byId.get(activeId);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable: "تقدر تغيّر حالة الطلب من قائمة «نقل إلى» في كل بطاقة.",
        },
      }}
    >
      <ColumnJumper cards={optimisticCards} />
      <ScrollToEnd
        dir="ltr"
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-6 md:mx-0 md:snap-none md:px-0"
      >
        {COLUMN_ORDER.map((status) => (
          <Column
            key={status}
            status={status}
            cards={optimisticCards.filter((c) => c.status === status)}
            today={today}
            onMove={move}
          />
        ))}
      </ScrollToEnd>
      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }}>
        {activeCard ? (
          <div dir="rtl">
            <CardBody card={activeCard} today={today} overlay />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/** Mobile shortcut row: tap a status to scroll its column into view. */
function ColumnJumper({ cards }: { cards: BoardCard[] }) {
  return (
    <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 md:hidden">
      {STATUS_KEYS.map((status) => {
        const count = cards.filter((c) => c.status === status).length;
        return (
          <button
            key={status}
            type="button"
            onClick={() =>
              document
                .getElementById(`column-${status}`)
                ?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" })
            }
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-line bg-paper px-3 text-xs text-ink-muted"
          >
            <span className="size-1.5 rounded-full" style={{ background: STATUS_META[status].color }} aria-hidden="true" />
            {statusLabel(status, false)}
            <span className="font-bold text-ink">{count}</span>
          </button>
        );
      })}
    </div>
  );
}

function Column({
  status,
  cards,
  today,
  onMove,
}: {
  status: Status;
  cards: BoardCard[];
  today: string;
  onMove: (id: number, status: Status) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const meta = STATUS_META[status];

  return (
    <section
      id={`column-${status}`}
      dir="rtl"
      aria-labelledby={`column-title-${status}`}
      className="flex w-[82vw] max-w-[300px] shrink-0 snap-start flex-col sm:w-[272px]"
    >
      <header className="mb-3 flex items-center justify-between px-1">
        <h2 id={`column-title-${status}`} className="flex items-center gap-2 text-sm font-bold">
          <span className="size-2 rounded-full" style={{ background: meta.color }} aria-hidden="true" />
          {statusLabel(status)}
        </h2>
        <span className="rounded-full border border-line bg-paper px-2 py-0.5 text-xs font-medium text-ink-muted">
          {cards.length}
        </span>
      </header>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[60vh] flex-1 flex-col gap-3 rounded-[20px] border-2 border-transparent bg-sand/45 p-2.5 transition-colors",
          isOver && "border-teal/40 bg-sage/60",
        )}
      >
        {cards.map((card) => (
          <DraggableCard key={card.id} card={card} today={today} onMove={onMove} />
        ))}
        {cards.length === 0 ? (
          <p className="grid min-h-28 place-items-center rounded-2xl border border-dashed border-line text-xs text-ink-subtle">
            اسحب طلب هنا
          </p>
        ) : null}
      </div>
    </section>
  );
}

function DraggableCard({
  card,
  today,
  onMove,
}: {
  card: BoardCard;
  today: string;
  onMove: (id: number, status: Status) => void;
}) {
  const { setNodeRef, listeners, isDragging } = useDraggable({ id: card.id });
  return (
    <article
      ref={setNodeRef}
      {...listeners}
      aria-label={`${card.jobTitle} — ${card.company}`}
      className={cn("touch-manipulation", isDragging && "opacity-35")}
    >
      <CardBody card={card} today={today} onMove={onMove} />
    </article>
  );
}

function CardBody({
  card,
  today,
  onMove,
  overlay = false,
}: {
  card: BoardCard;
  today: string;
  onMove?: (id: number, status: Status) => void;
  overlay?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border border-line bg-paper p-3.5 shadow-[0_1px_2px_rgba(17,17,15,0.04),0_6px_16px_rgba(17,17,15,0.05)] transition-shadow hover:shadow-card",
        overlay ? "rotate-[2.5deg] cursor-grabbing shadow-lift" : "cursor-grab",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/applications/${card.id}`}
          draggable={false}
          className="min-w-0 rounded-md font-semibold leading-snug outline-offset-4 after:absolute after:inset-0 after:rounded-2xl hover:underline"
        >
          {card.jobTitle}
        </Link>
        {onMove ? <MoveMenu card={card} onMove={onMove} /> : null}
      </div>
      <p className="mt-0.5 truncate text-sm text-ink-muted">{card.company}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <SourceBadge source={card.source} />
        <span className="flex items-center gap-2 text-xs text-ink-subtle">
          <PriorityDot priority={card.priority} />
          {relativeDays(card.appliedDate, today)}
        </span>
      </div>
      {card.staleDays !== null ? (
        <p className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-cream px-2 py-1 text-[11px] text-ink-muted">
          <Ghost className="size-3.5" aria-hidden="true" />
          بدون رد من {daysPhrase(card.staleDays)}
        </p>
      ) : null}
    </div>
  );
}

function MoveMenu({ card, onMove }: { card: BoardCard; onMove: (id: number, status: Status) => void }) {
  const stop = (event: React.SyntheticEvent) => event.stopPropagation();
  return (
    <DropdownMenu dir="rtl">
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={`نقل «${card.jobTitle}» إلى حالة ثانية`}
          className="relative z-10 -me-1 -mt-0.5 shrink-0"
          onMouseDown={stop}
          onTouchStart={stop}
        >
          <Ellipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44" onMouseDown={stop} onTouchStart={stop}>
        <DropdownMenuLabel className="text-xs text-ink-subtle">نقل إلى</DropdownMenuLabel>
        {STATUS_KEYS.filter((s) => s !== card.status).map((status) => (
          <DropdownMenuItem key={status} onSelect={() => onMove(card.id, status)}>
            <span className="size-2 rounded-full" style={{ background: STATUS_META[status].color }} aria-hidden="true" />
            {statusLabel(status)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
