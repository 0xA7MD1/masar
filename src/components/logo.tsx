import { cn } from "@/lib/utils";

/** A path from a starting point (cream) to the goal (coral). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-8", className)}>
      <rect width="32" height="32" rx="9" fill="#11110F" />
      <path
        d="M9.5 22.5C9.5 15 22.5 17 22.5 9.5"
        stroke="#35B0A5"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="9.5" cy="22.5" r="2.6" fill="#F4F1E8" />
      <circle cx="22.5" cy="9.5" r="3" fill="#FF4F2F" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-xl font-bold tracking-tight">مسار</span>
    </span>
  );
}
