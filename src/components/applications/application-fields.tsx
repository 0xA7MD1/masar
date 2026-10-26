"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import { SourceBadge } from "@/components/status-badges";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Application } from "@/db/schema";
import type { FieldErrors } from "@/lib/action-result";
import {
  JOB_TYPE_KEYS,
  JOB_TYPE_LABELS,
  PRIORITY_KEYS,
  PRIORITY_META,
  SOURCE_KEYS,
  SOURCE_LABELS,
  STATUS_KEYS,
  statusLabel,
  WORK_MODE_KEYS,
  WORK_MODE_LABELS,
  type Source,
} from "@/lib/constants";
import { detectSource, linkHost } from "@/lib/links";
import { cn } from "@/lib/utils";

import { ChipGroup, DatePicker, Field, SelectField } from "./form-fields";

export type ApplicationDefaults = Partial<
  Pick<
    Application,
    | "jobTitle"
    | "company"
    | "source"
    | "jobType"
    | "workMode"
    | "location"
    | "jobUrl"
    | "appliedDate"
    | "status"
    | "expectedSalary"
    | "cvTailored"
    | "nextFollowUp"
    | "priority"
    | "notes"
    | "followUpUrl"
  >
>;

const SOURCE_OPTIONS = SOURCE_KEYS.map((value) => ({ value, label: SOURCE_LABELS[value] }));
const JOB_TYPE_OPTIONS = JOB_TYPE_KEYS.map((value) => ({ value, label: JOB_TYPE_LABELS[value] }));
const WORK_MODE_OPTIONS = WORK_MODE_KEYS.map((value) => ({ value, label: WORK_MODE_LABELS[value] }));
const PRIORITY_OPTIONS = PRIORITY_KEYS.map((value) => ({ value, label: PRIORITY_META[value].label }));
const STATUS_OPTIONS = STATUS_KEYS.map((value) => ({ value, label: statusLabel(value) }));

/** Fields always visible above "تفاصيل إضافية". */
const MAIN_FIELDS = ["jobUrl", "source", "jobTitle", "company"];

const invalid = (errors: FieldErrors, key: string) => (errors[key]?.length ? true : undefined);
const describedBy = (errors: FieldErrors, id: string, key: string) =>
  errors[key]?.length ? `${id}-error` : undefined;

function DetailFields({
  idPrefix,
  defaults,
  errors,
}: {
  idPrefix: string;
  defaults: ApplicationDefaults;
  errors: FieldErrors;
}) {
  const id = (name: string) => `${idPrefix}-${name}`;
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <SelectField
        id={id("status")}
        name="status"
        label="الحالة"
        options={STATUS_OPTIONS}
        defaultValue={defaults.status ?? "applied"}
        error={errors.status}
      />
      <Field label="تاريخ التقديم" htmlFor={id("appliedDate")} error={errors.appliedDate}>
        <DatePicker
          id={id("appliedDate")}
          name="appliedDate"
          defaultValue={defaults.appliedDate}
          aria-invalid={invalid(errors, "appliedDate")}
          aria-describedby={describedBy(errors, id("appliedDate"), "appliedDate")}
        />
      </Field>
      <div className="sm:col-span-2">
        <ChipGroup
          name="jobType"
          legend="نوع الوظيفة"
          options={JOB_TYPE_OPTIONS}
          defaultValue={defaults.jobType}
          allowDeselect
          error={errors.jobType}
        />
      </div>
      <ChipGroup
        name="workMode"
        legend="طريقة العمل"
        options={WORK_MODE_OPTIONS}
        defaultValue={defaults.workMode}
        allowDeselect
        error={errors.workMode}
      />
      <ChipGroup
        name="priority"
        legend="الأولوية"
        options={PRIORITY_OPTIONS}
        defaultValue={defaults.priority ?? "medium"}
        error={errors.priority}
      />
      <Field label="الموقع" htmlFor={id("location")} error={errors.location}>
        <Input
          id={id("location")}
          name="location"
          placeholder="مثلاً: الرياض"
          defaultValue={defaults.location ?? ""}
          aria-invalid={invalid(errors, "location")}
        />
      </Field>
      <Field label="الراتب المتوقع" htmlFor={id("expectedSalary")} error={errors.expectedSalary}>
        <Input
          id={id("expectedSalary")}
          name="expectedSalary"
          placeholder="مثلاً: 12,000 ريال"
          defaultValue={defaults.expectedSalary ?? ""}
          aria-invalid={invalid(errors, "expectedSalary")}
        />
      </Field>
      <Field
        label="رابط المتابعة"
        htmlFor={id("followUpUrl")}
        error={errors.followUpUrl}
        hint="رقم واتساب، أو إيميل، أو أي رابط. يطلع لك زر «تابع» يوديك له على طول."
        className="sm:col-span-2"
      >
        <Input
          id={id("followUpUrl")}
          name="followUpUrl"
          type="text"
          dir="ltr"
          className="text-start"
          autoComplete="off"
          placeholder="05XXXXXXXX · hr@company.com · https://"
          defaultValue={defaults.followUpUrl ?? ""}
          aria-invalid={invalid(errors, "followUpUrl")}
          aria-describedby={describedBy(errors, id("followUpUrl"), "followUpUrl")}
        />
      </Field>
      <Field label="موعد المتابعة" htmlFor={id("nextFollowUp")} error={errors.nextFollowUp} hint="نذكّرك فيه بالرئيسية.">
        <DatePicker
          id={id("nextFollowUp")}
          name="nextFollowUp"
          clearable
          placeholder="بدون موعد"
          defaultValue={defaults.nextFollowUp}
          aria-invalid={invalid(errors, "nextFollowUp")}
        />
      </Field>
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-cream/60 px-4 py-3 sm:self-end">
        <label htmlFor={id("cvTailored")} className="text-sm font-medium text-ink">
          عدّلت السيرة الذاتية لهذي الوظيفة؟
        </label>
        <Switch id={id("cvTailored")} name="cvTailored" defaultChecked={defaults.cvTailored ?? false} />
      </div>
      <Field label="ملاحظات" htmlFor={id("notes")} error={errors.notes} className="sm:col-span-2">
        <Textarea
          id={id("notes")}
          name="notes"
          rows={4}
          placeholder="أي شي تبي تتذكره: أسماء، أسئلة المقابلة، الخطوة الجاية…"
          defaultValue={defaults.notes ?? ""}
          className="min-h-24"
          aria-invalid={invalid(errors, "notes")}
        />
      </Field>
    </div>
  );
}

/**
 * The job link decides the source as it is typed. The pills only show when there
 * is no link (WhatsApp, walk-in…), when asked for, or once a source was picked by hand.
 */
function LinkAndSource({
  idPrefix,
  defaults,
  errors,
  autoFocus,
}: {
  idPrefix: string;
  defaults: ApplicationDefaults;
  errors: FieldErrors;
  autoFocus: boolean;
}) {
  const id = (name: string) => `${idPrefix}-${name}`;
  const [jobUrl, setJobUrl] = useState(defaults.jobUrl ?? "");
  // A saved source that the link would also give is treated as automatic.
  const [manualSource, setManualSource] = useState<Source | null>(() =>
    defaults.source && defaults.source !== detectSource(defaults.jobUrl) ? defaults.source : null,
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const detected = detectSource(jobUrl);
  const source = manualSource ?? detected;
  const showPicker = pickerOpen || manualSource !== null || !detected || Boolean(errors.source?.length);
  const host = linkHost(jobUrl);

  return (
    <>
      <Field
        label="رابط الوظيفة"
        htmlFor={id("jobUrl")}
        error={errors.jobUrl}
        hint="الصقه ونعرف الموقع لحالنا: LinkedIn، جدارات، Bayt، تنقيب، مرجان، صبار…"
      >
        <Input
          id={id("jobUrl")}
          name="jobUrl"
          type="text"
          inputMode="url"
          dir="ltr"
          className="text-start"
          autoFocus={autoFocus}
          autoComplete="off"
          placeholder="https://"
          value={jobUrl}
          onChange={(event) => setJobUrl(event.target.value)}
          aria-invalid={invalid(errors, "jobUrl")}
          aria-describedby={describedBy(errors, id("jobUrl"), "jobUrl")}
        />
      </Field>

      {showPicker ? (
        <ChipGroup
          name="source"
          legend="من وين لقيت الوظيفة؟"
          options={SOURCE_OPTIONS}
          value={source}
          onValueChange={setManualSource}
          required={!detected}
          error={errors.source}
        >
          {detected && !manualSource ? (
            <p className="text-xs text-ink-subtle">اخترناه من الرابط، وتقدر تغيّره.</p>
          ) : null}
        </ChipGroup>
      ) : (
        <div
          role="status"
          className="flex flex-wrap items-center gap-2 rounded-2xl border border-brand/20 bg-brand-soft/60 px-4 py-3 text-sm"
        >
          <input type="hidden" name="source" value={detected ?? ""} />
          <Check className="size-4 shrink-0 text-brand" aria-hidden="true" />
          <span className="text-ink-muted">المصدر:</span>
          <SourceBadge source={detected!} className="border-brand/20 bg-paper text-ink" />
          {detected === "company_site" && host ? (
            <span dir="ltr" className="truncate text-xs text-ink-subtle">
              {host}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="ms-auto rounded-md text-xs font-medium text-brand underline-offset-4 hover:underline"
          >
            غيّره
          </button>
        </div>
      )}
    </>
  );
}

export function ApplicationFields({
  idPrefix,
  defaults,
  errors,
  collapsibleDetails = false,
  autoFocus = false,
}: {
  idPrefix: string;
  defaults: ApplicationDefaults;
  errors: FieldErrors;
  /** Quick add hides everything except the link, source, title and company. */
  collapsibleDetails?: boolean;
  autoFocus?: boolean;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const id = (name: string) => `${idPrefix}-${name}`;
  // Errors inside the hidden section would be invisible, so open it for them.
  const hasDetailErrors = Object.entries(errors).some(
    ([key, messages]) => !MAIN_FIELDS.includes(key) && messages?.length,
  );
  const isOpen = detailsOpen || hasDetailErrors;

  return (
    <div className="space-y-5">
      <LinkAndSource idPrefix={idPrefix} defaults={defaults} errors={errors} autoFocus={autoFocus} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="المسمى الوظيفي" htmlFor={id("jobTitle")} error={errors.jobTitle}>
          <Input
            id={id("jobTitle")}
            name="jobTitle"
            autoComplete="off"
            placeholder="مثلاً: Frontend Developer"
            defaultValue={defaults.jobTitle ?? ""}
            aria-invalid={invalid(errors, "jobTitle")}
            aria-describedby={describedBy(errors, id("jobTitle"), "jobTitle")}
          />
        </Field>
        <Field label="الشركة" htmlFor={id("company")} error={errors.company}>
          <Input
            id={id("company")}
            name="company"
            autoComplete="organization"
            placeholder="مثلاً: Tamara"
            defaultValue={defaults.company ?? ""}
            aria-invalid={invalid(errors, "company")}
            aria-describedby={describedBy(errors, id("company"), "company")}
          />
        </Field>
      </div>

      {collapsibleDetails ? (
        <Collapsible open={isOpen} onOpenChange={setDetailsOpen}>
          <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-2xl border border-dashed border-line px-4 py-3 text-sm font-medium text-ink-muted transition-colors hover:border-line-strong hover:text-ink">
            تفاصيل إضافية
            <span className="flex items-center gap-2 text-xs text-ink-subtle">
              اختياري
              <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" />
            </span>
          </CollapsibleTrigger>
          {/* Kept mounted while closed so typed values still submit. */}
          <CollapsibleContent forceMount className={cn("pt-5", !isOpen && "hidden")}>
            <DetailFields idPrefix={idPrefix} defaults={defaults} errors={errors} />
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <DetailFields idPrefix={idPrefix} defaults={defaults} errors={errors} />
      )}
    </div>
  );
}
