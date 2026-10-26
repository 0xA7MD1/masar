"use client";

import { useRef, useState, useTransition } from "react";
import { Download, FileJson, Loader2, LogOut, Save, Upload } from "lucide-react";
import { toast } from "sonner";

import { importBackup, logout, updateSettings } from "@/actions/settings";
import { Field } from "@/components/applications/form-fields";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FieldErrors } from "@/lib/action-result";
import { applicationsPhrase } from "@/lib/arabic";

export function ProfileForm({ displayName, weeklyGoal }: { displayName: string; weeklyGoal: number }) {
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<FieldErrors>({});

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await updateSettings(formData);
          if (!result.ok) {
            setErrors(result.fieldErrors ?? {});
            toast.error(result.error);
            return;
          }
          setErrors({});
          toast.success("انحفظت الإعدادات");
        });
      }}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="اسمك" htmlFor="displayName" error={errors.displayName} hint="يظهر في التحية بالرئيسية.">
          <Input
            id="displayName"
            name="displayName"
            defaultValue={displayName}
            placeholder="مثلاً: أحمد"
            autoComplete="given-name"
            aria-invalid={errors.displayName?.length ? true : undefined}
          />
        </Field>
        <Field label="هدف الطلبات كل أسبوع" htmlFor="weeklyGoal" error={errors.weeklyGoal} hint="الأسبوع يبدأ يوم الأحد.">
          <Input
            id="weeklyGoal"
            name="weeklyGoal"
            // Text + numeric keyboard: a number input would render Arabic-Indic digits.
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={3}
            dir="ltr"
            className="text-end"
            defaultValue={weeklyGoal}
            aria-invalid={errors.weeklyGoal?.length ? true : undefined}
          />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save aria-hidden="true" />}
          احفظ
        </Button>
      </div>
    </form>
  );
}

export function ExportButtons() {
  return (
    <>
      <Button asChild variant="outline">
        <a href="/api/export?format=json" download>
          <Download aria-hidden="true" />
          تصدير JSON
        </a>
      </Button>
      <Button asChild variant="outline">
        <a href="/api/export?format=csv" download>
          <Download aria-hidden="true" />
          تصدير CSV
        </a>
      </Button>
    </>
  );
}

type PendingImport = { fileName: string; data: unknown; count: number };

export function ImportBackup() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [importing, startImport] = useTransition();

  async function onFile(file: File | undefined) {
    if (!file) return;
    try {
      const data: unknown = JSON.parse(await file.text());
      const apps = (data as { applications?: unknown })?.applications;
      if (!Array.isArray(apps)) throw new Error("missing applications");
      setPendingImport({ fileName: file.name, data, count: apps.length });
    } catch {
      toast.error("ما قدرت أقرا الملف. تأكد إنه ملف JSON صدّرته من مسار.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
        <Upload aria-hidden="true" />
        استيراد من JSON
      </Button>

      <AlertDialog open={pendingImport !== null} onOpenChange={(open) => !open && setPendingImport(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تستبدل بياناتك بالنسخة الاحتياطية؟</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p className="flex items-center gap-2 font-medium text-ink">
                  <FileJson className="size-4" aria-hidden="true" />
                  {pendingImport?.fileName} — {applicationsPhrase(pendingImport?.count ?? 0)}
                </p>
                <p>كل الطلبات الحالية وسجلها بتنحذف وتنستبدل بمحتوى الملف. صدّر نسخة من بياناتك الحالية أول لو تبي تحتفظ فيها.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive-solid"
              disabled={importing}
              onClick={(event) => {
                event.preventDefault();
                if (!pendingImport) return;
                startImport(async () => {
                  const result = await importBackup(pendingImport.data);
                  if (!result.ok) {
                    toast.error(result.error);
                    return;
                  }
                  setPendingImport(null);
                  toast.success(`رجعت ${applicationsPhrase(result.data.applications)} من النسخة الاحتياطية`);
                });
              }}
            >
              {importing ? <Loader2 className="animate-spin" /> : null}
              إيه، استبدلها
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function LogoutButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button variant="outline" disabled={pending} onClick={() => startTransition(() => logout())}>
      {pending ? <Loader2 className="animate-spin" /> : <LogOut aria-hidden="true" />}
      تسجيل الخروج
    </Button>
  );
}
