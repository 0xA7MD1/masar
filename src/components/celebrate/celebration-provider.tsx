"use client";

import { createContext, useCallback, useContext } from "react";
import { toast } from "sonner";

import type { Celebration, MotivationFeedback } from "@/lib/celebrations";

type Celebrate = (feedback: MotivationFeedback | undefined) => void;

const CelebrationContext = createContext<Celebrate>(() => {});

const CONFETTI_COLORS = ["#268F86", "#35B0A5", "#00443C", "#FF4F2F", "#D8E3D3", "#FFFDF7"];

async function fireConfetti(big: boolean) {
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
}

function CelebrationToast({ celebration }: { celebration: Celebration }) {
  return (
    <div
      role="status"
      className="sticker flex w-[356px] max-w-[calc(100vw-2rem)] rotate-[-1.5deg] items-start gap-3 p-4 font-sans"
    >
      <span
        aria-hidden="true"
        className="grid size-11 shrink-0 place-items-center rounded-2xl bg-sage text-2xl"
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

export function CelebrationProvider({ children }: { children: React.ReactNode }) {
  const celebrate = useCallback<Celebrate>((feedback) => {
    if (!feedback) return;
    const { celebrations, encouragement } = feedback;
    if (celebrations.length > 0) {
      const big = celebrations.some((c) => c.kind === "offer" || c.kind === "accepted" || c.kind === "weekly_goal");
      void fireConfetti(big);
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
  }, []);

  return <CelebrationContext value={celebrate}>{children}</CelebrationContext>;
}

export function useCelebrate(): Celebrate {
  return useContext(CelebrationContext);
}
