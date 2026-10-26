"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";

import { QuickAddForm } from "./quick-add-form";

const QuickAddContext = createContext<{ openQuickAdd: () => void }>({ openQuickAdd: () => {} });

const TITLE = "طلب جديد";
const DESCRIPTION = "المسمى والشركة والمصدر وخلصت — الباقي اختياري.";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

export function QuickAddProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const openQuickAdd = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  // "N" opens quick add from anywhere (KeyN works on Arabic keyboard layouts too).
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.code !== "KeyN" || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target) || document.querySelector("[role=dialog]")) return;
      event.preventDefault();
      setOpen(true);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = useMemo(() => ({ openQuickAdd }), [openQuickAdd]);

  return (
    <QuickAddContext value={value}>
      {children}
      {isDesktop ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="display text-2xl">{TITLE}</DialogTitle>
              <DialogDescription>{DESCRIPTION}</DialogDescription>
            </DialogHeader>
            {open ? <QuickAddForm onDone={close} /> : null}
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent>
            <DrawerHeader className="text-start">
              <DrawerTitle className="display text-2xl">{TITLE}</DrawerTitle>
              <DrawerDescription>{DESCRIPTION}</DrawerDescription>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
              {open ? <QuickAddForm onDone={close} /> : null}
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </QuickAddContext>
  );
}

export function useQuickAdd() {
  return useContext(QuickAddContext);
}
