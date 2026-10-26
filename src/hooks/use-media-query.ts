"use client";

import { useSyncExternalStore } from "react";

/** Returns `undefined` during SSR and the first client render, then the live match. */
export function useMediaQuery(query: string): boolean | undefined {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => undefined,
  );
}
