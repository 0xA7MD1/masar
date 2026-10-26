"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Trash } from "lucide-react";
import { toast } from "sonner";

import { deleteApplication, updateApplication } from "@/actions/applications";
import { useCelebrate } from "@/components/celebrate/celebration-provider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { FieldErrors } from "@/lib/action-result";
import { primaryName } from "@/lib/application-name";

import { ApplicationFields, type ApplicationDefaults } from "./application-fields";

export function ApplicationEditForm({ id, defaults }: { id: number; defaults: ApplicationDefaults }) {
  const celebrate = useCelebrate();
  const [saving, startSaving] = useTransition();
  const [errors, setErrors] = useState<FieldErrors>({});

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startSaving(async () => {
      const result = await updateApplication(id, formData);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }
      setErrors({});
      toast.success("انحفظت التعديلات");
      celebrate(result.data);
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <ApplicationFields idPrefix="edit" defaults={defaults} errors={errors} />
      <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        <DeleteApplicationButton id={id} title={primaryName({ jobTitle: defaults.jobTitle ?? "", company: defaults.company ?? "" })} />
        <Button type="submit" size="lg" disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : <Save aria-hidden="true" />}
          احفظ التعديلات
        </Button>
      </div>
    </form>
  );
}

function DeleteApplicationButton({ id, title }: { id: number; title: string }) {
  const router = useRouter();
  const [deleting, startDeleting] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="destructive">
          <Trash aria-hidden="true" />
          احذف الطلب
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>تحذف «{title}»؟</AlertDialogTitle>
          <AlertDialogDescription>
            بينحذف الطلب وكل سجل حالاته نهائياً، وما تقدر ترجعه. لو تبي تحتفظ بنسخة، صدّر بياناتك من الإعدادات أول.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>لا، خلّه</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive-solid"
            disabled={deleting}
            onClick={(event) => {
              event.preventDefault();
              startDeleting(async () => {
                const result = await deleteApplication(id);
                if (!result.ok) {
                  toast.error(result.error);
                  return;
                }
                toast.success("انحذف الطلب");
                router.replace("/applications");
              });
            }}
          >
            {deleting ? <Loader2 className="animate-spin" /> : null}
            إيه، احذفه
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
