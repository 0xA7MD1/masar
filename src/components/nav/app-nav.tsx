"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Plus, Settings2 } from "lucide-react";

import { Logo } from "@/components/logo";
import { useQuickAdd } from "@/components/quick-add/quick-add-sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { isActive, NAV_ITEMS } from "./nav-items";

export function TopNav() {
  const pathname = usePathname();
  const { openQuickAdd } = useQuickAdd();

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-cream/88 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-8">
        <Link href="/" aria-label="مسار — الرئيسية" className="rounded-xl">
          <Logo />
        </Link>

        <nav aria-label="التنقل الرئيسي" className="hidden md:block">
          <ul className="flex items-center gap-1 rounded-full border border-line bg-paper/70 p-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex h-9 items-center rounded-full px-4 text-sm font-medium transition-colors",
                      active ? "bg-ink text-cream" : "text-ink-muted hover:bg-sand/70 hover:text-ink",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <Button onClick={openQuickAdd} className="hidden md:inline-flex" aria-keyshortcuts="n">
          أضف طلب
          <ArrowLeft data-icon="inline-end" />
        </Button>
        <Link
          href="/settings"
          aria-label="الإعدادات"
          aria-current={isActive(pathname, "/settings") ? "page" : undefined}
          className={cn(
            "grid size-10 place-items-center rounded-full border border-line bg-paper/70 text-ink-muted md:hidden",
            isActive(pathname, "/settings") && "bg-ink text-cream",
          )}
        >
          <Settings2 className="size-[18px]" aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => item.href !== "/settings");

  return (
    <nav
      aria-label="التنقل السفلي"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-cream/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                  active ? "text-ink" : "text-ink-subtle",
                )}
              >
                <span
                  className={cn(
                    "grid h-7 w-12 place-items-center rounded-full transition-colors",
                    active && "bg-brand-soft text-brand-deep",
                  )}
                >
                  <Icon className="size-[18px]" aria-hidden="true" />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function QuickAddFab() {
  const { openQuickAdd } = useQuickAdd();
  return (
    <button
      type="button"
      onClick={openQuickAdd}
      aria-label="أضف طلب جديد"
      className="fixed end-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 grid size-14 place-items-center rounded-full bg-ink text-cream shadow-[0_12px_30px_rgba(17,17,15,0.3)] transition-transform active:scale-95 md:hidden"
    >
      <Plus className="size-6" aria-hidden="true" />
    </button>
  );
}
