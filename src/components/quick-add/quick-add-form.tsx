"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createApplication } from "@/actions/applications";
import { ApplicationFields } from "@/components/applications/application-fields";
import { useCelebrate } from "@/components/celebrate/celebration-provider";
import { Button } from "@/components/ui/button";
import type { FieldErrors } from "@/lib/action-result";
import { todayISO } from "@/lib/dates";

export function QuickAddForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const celebrate = useCelebrate();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<FieldErrors>({});
  // Computed when the form mounts (i.e. when the sheet opens), so it is always today.
  const [today] = useState(todayISO);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createApplication(formData);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }
      onDone();
      toast.success("انضاف الطلب ✨", {
        action: { label: "افتحه", onClick: () => router.push(`/applications/${result.data.id}`) },
      });
      celebrate(result.data);
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <ApplicationFields
        idPrefix="quick"
        defaults={{ appliedDate: today, status: "applied", priority: "medium" }}
        errors={errors}
        collapsibleDetails
        autoFocus
      />
      <div className="flex items-center justify-between gap-3">
        <p className="hidden text-xs text-ink-subtle sm:block">
          اضغط <kbd className="rounded-md border border-line bg-cream px-1.5 py-0.5 font-sans">Enter</kbd> للحفظ
        </p>
        <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
          {pending ? <Loader2 className="animate-spin" /> : null}
          أضف الطلب
          {!pending ? <ArrowLeft data-icon="inline-end" /> : null}
        </Button>
      </div>
    </form>
  );
}
