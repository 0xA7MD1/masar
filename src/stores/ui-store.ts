"use client";

import { create } from "zustand";

import type { MotivationFeedback } from "@/lib/celebrations";
import { DEFAULT_FILTERS, type ApplicationFilters } from "@/lib/filters";

// UI state only. Server data lives in the TanStack Query cache, never here.

type QuickAddState = {
  open: boolean;
  setOpen: (open: boolean) => void;
  openQuickAdd: () => void;
};

export const useQuickAddStore = create<QuickAddState>()((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  openQuickAdd: () => set({ open: true }),
}));

type FiltersState = {
  filters: ApplicationFilters;
  setFilters: (patch: Partial<ApplicationFilters>) => void;
  clearFilters: () => void;
};

/** Kept for the session, so coming back to the list keeps the same search. */
export const useFiltersStore = create<FiltersState>()((set) => ({
  filters: DEFAULT_FILTERS,
  setFilters: (patch) => set((state) => ({ filters: { ...state.filters, ...patch } })),
  clearFilters: () =>
    set((state) => ({ filters: { ...DEFAULT_FILTERS, sort: state.filters.sort, dir: state.filters.dir } })),
}));

type CelebrationState = {
  /** Feedback waiting for the celebration host to play it. */
  queue: MotivationFeedback[];
  celebrate: (feedback: MotivationFeedback | undefined) => void;
  drain: () => MotivationFeedback[];
};

export const useCelebrationStore = create<CelebrationState>()((set, get) => ({
  queue: [],
  celebrate: (feedback) => {
    if (!feedback || (feedback.celebrations.length === 0 && !feedback.encouragement)) return;
    set((state) => ({ queue: [...state.queue, feedback] }));
  },
  drain: () => {
    const { queue } = get();
    if (queue.length > 0) set({ queue: [] });
    return queue;
  },
}));

/** Resets every store, e.g. when the user signs out. */
export function resetUiStores() {
  useQuickAddStore.setState({ open: false });
  useFiltersStore.setState({ filters: DEFAULT_FILTERS });
  useCelebrationStore.setState({ queue: [] });
}
