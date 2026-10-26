"use client";

import { useTransition } from "react";
import { Ghost, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { updateApplicationStatus } from "@/actions/applications";
import { Button } from "@/components/ui/button";

export function MarkGhostedButton({ id, size = "sm" }: { id: number; size?: "sm" | "default" }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size={size}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await updateApplicationStatus(id, "ghosted");
          if (result.ok) toast("انتقل إلى «ما ردّوا» 👻 — ركّز على اللي جاي.");
          else toast.error(result.error);
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <Ghost aria-hidden="true" />}
      علّمه «ما ردّوا»
    </Button>
  );
}
