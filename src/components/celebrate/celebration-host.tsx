"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import type { Celebration, MotivationFeedback } from "@/lib/celebrations";
import { useCelebrationStore } from "@/stores/ui-store";

const CONFETTI_COLORS = ["#268F86", "#35B0A5", "#00443C", "#FF4F2F", "#D8E3D3", "#FFFDF7"];

type ConfettiSize = "small" | "big" | "huge";

/** Each goal period gets its own reward size, so a month feels bigger than a day. */
function confettiSize(celebrations: Celebration[]): ConfettiSize {
  const kinds = new Set(celebrations.map((c) => c.kind));
  if (kinds.has("month_goal") || kinds.has("accepted")) return "huge";
  if (kinds.has("week_goal") || kinds.has("offer")) return "big";
  return "small";
}

async function fireConfetti(size: ConfettiSize) {
  const big = size !== "small";
  const confetti = (await import("canvas-confetti")).default;
  const base = {
    colors: CONFETTI_COLORS,
    disableForReducedMotion: true,
    zIndex: 9999,
    ticks: 240,
    scalar: 0.95,
  };
  confetti({ ...base, particleCount: big ? 130 : 80, spread: 80, startVelocity: 42, origin: { x: 0.5, y: 0.3 } });
  if (big) {
    window.setTimeout(() => {
      confetti({ ...base, particleCount: 60, angle: 60, spread: 65, origin: { x: 0, y: 0.65 } });
      confetti({ ...base, particleCount: 60, angle: 120, spread: 65, origin: { x: 1, y: 0.65 } });
    }, 250);
  }
  if (size === "huge") {
    window.setTimeout(() => {
      confetti({ ...base, particleCount: 160, spread: 140, startVelocity: 50, scalar: 1.15, origin: { x: 0.5, y: 0.2 } });
    }, 700);
  }
}

function CelebrationToast({ celebration }: { celebration: Celebration }) {
  return (
    <div
      role="status"
      className="sticker flex w-[356px] max-w-[calc(100vw-2rem)] rotate-[-1.5deg] items-start gap-3 p-4 font-sans"
    >
      <span
        aria-hidden="true"
        className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-2xl"
      >
        {celebration.emoji}
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="font-bold text-ink">{celebration.title}</p>
        {celebration.description ? (
          <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">{celebration.description}</p>
        ) : null}
      </div>
    </div>
  );
}

function EncouragementToast({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="sticker flex w-[356px] max-w-[calc(100vw-2rem)] rotate-[1deg] items-center gap-3 border-s-4 border-s-coral p-4 font-sans"
    >
      <p className="text-sm font-medium leading-relaxed text-ink">{message}</p>
    </div>
  );
}

function play({ celebrations, encouragement }: MotivationFeedback) {
  if (celebrations.length > 0) {
    void fireConfetti(confettiSize(celebrations));
    celebrations.forEach((celebration, i) => {
      window.setTimeout(
        () => toast.custom(() => <CelebrationToast celebration={celebration} />, { duration: 6500 }),
        i * 450,
      );
    });
  }
  if (encouragement) {
    toast.custom(() => <EncouragementToast message={encouragement} />, { duration: 7000 });
  }
}

/** Mounted once in the app layout; plays whatever feedback lands in the celebration store. */
export function CelebrationHost() {
  const queue = useCelebrationStore((s) => s.queue);
  const drain = useCelebrationStore((s) => s.drain);

  useEffect(() => {
    if (queue.length > 0) drain().forEach(play);
  }, [queue, drain]);

  return null;
}

export function useCelebrate() {
  return useCelebrationStore((s) => s.celebrate);
}
