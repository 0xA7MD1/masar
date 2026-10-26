"use client";

import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useQuickAdd } from "./quick-add-provider";

export function QuickAddButton({
  children = "أضف طلب",
  size = "lg",
  variant = "default",
  className,
}: {
  children?: React.ReactNode;
  size?: "default" | "lg" | "sm";
  variant?: "default" | "outline";
  className?: string;
}) {
  const { openQuickAdd } = useQuickAdd();
  return (
    <Button size={size} variant={variant} onClick={openQuickAdd} className={className}>
      {children}
      <ArrowLeft data-icon="inline-end" />
    </Button>
  );
}
