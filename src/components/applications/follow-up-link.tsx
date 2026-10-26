import { ExternalLink, Mail, MessageCircle } from "lucide-react";

import { followUpKind, type FollowUpKind } from "@/lib/links";
import { cn } from "@/lib/utils";

const ICONS: Record<FollowUpKind, typeof ExternalLink> = {
  whatsapp: MessageCircle,
  email: Mail,
  link: ExternalLink,
};

const LABELS: Record<FollowUpKind, string> = {
  whatsapp: "تابع بالواتس",
  email: "تابع بالإيميل",
  link: "تابع",
};

/** Opens the saved WhatsApp chat, mail search or page in one tap. */
export function FollowUpLink({
  href,
  size = "default",
  className,
}: {
  href: string;
  size?: "default" | "sm";
  className?: string;
}) {
  const kind = followUpKind(href);
  const Icon = ICONS[kind];
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand font-semibold text-paper transition-colors hover:bg-brand-deep",
        size === "sm" ? "h-7 px-3 text-xs" : "h-10 px-5 text-sm",
        className,
      )}
    >
      <Icon className={size === "sm" ? "size-3.5" : "size-4"} aria-hidden="true" />
      {LABELS[kind]}
    </a>
  );
}
