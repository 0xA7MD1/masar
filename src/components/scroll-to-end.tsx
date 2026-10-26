"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Horizontal scroller that starts at its inline end, so the newest data (on the
 * left in RTL) is visible first on narrow screens.
 */
export function ScrollToEnd({ className, children, ...props }: React.ComponentProps<"div">) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    el.scrollLeft = rtl ? -el.scrollWidth : el.scrollWidth;
  }, []);

  return (
    <div ref={ref} className={className} {...props}>
      {children}
    </div>
  );
}
