"use client";

import { Ghost, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useMoveApplication } from "@/hooks/use-masar-data";

export function MarkGhostedButton({ id, size = "sm" }: { id: number; size?: "sm" | "default" }) {
  const { mutate, isPending: pending } = useMoveApplication();

  return (
    <Button
      variant="outline"
      size={size}
      disabled={pending}
      onClick={() =>
        mutate(
          { id, status: "ghosted" },
          {
            onSuccess: () => toast("انتقل إلى «ما ردّوا» 👻 — ركّز على اللي جاي."),
            onError: (error) => toast.error(error.message),
          },
        )
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <Ghost aria-hidden="true" />}
      علّمه «ما ردّوا»
    </Button>
  );
}
