"use client";

import { useId, useState } from "react";
import { CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, monthLabel, todayISO, WEEKDAY_INITIALS, WEEKDAYS } from "@/lib/dates";
import { cn } from "@/lib/utils";

export function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p id={id} className="text-xs text-destructive">
      {messages[0]}
    </p>
  );
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string[];
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={htmlFor} className="text-ink">
        {label}
      </Label>
      {children}
      {hint && !error?.length ? <p className="text-xs text-ink-subtle">{hint}</p> : null}
      <FieldError id={`${htmlFor}-error`} messages={error} />
    </div>
  );
}

export type Option<T extends string> = { value: T; label: string };

/**
 * Pill-shaped radio group built on native radios, so arrow keys work out of the box.
 * With `allowDeselect`, clicking the selected pill clears it.
 */
export function ChipGroup<T extends string>({
  name,
  legend,
  options,
  defaultValue,
  allowDeselect = false,
  error,
  required,
  size = "default",
}: {
  name: string;
  legend: string;
  options: readonly Option<T>[];
  defaultValue?: T | null;
  allowDeselect?: boolean;
  error?: string[];
  required?: boolean;
  size?: "default" | "sm";
}) {
  const [value, setValue] = useState<T | null>(defaultValue ?? null);
  const errorId = useId();

  return (
    <fieldset
      className="space-y-2"
      aria-invalid={error?.length ? true : undefined}
      aria-describedby={error?.length ? errorId : undefined}
    >
      <legend className="mb-2 text-sm font-medium text-ink">
        {legend}
        {required ? <span className="text-ink-subtle"> *</span> : null}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              "inline-flex cursor-pointer items-center rounded-full border border-line bg-paper text-ink-muted transition-colors select-none hover:border-[#d6cdbd] hover:text-ink",
              "has-checked:border-ink has-checked:bg-ink has-checked:text-cream",
              "has-focus-visible:ring-3 has-focus-visible:ring-ring/30",
              size === "sm" ? "h-8 px-3 text-xs" : "h-9 px-3.5 text-sm",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              required={required}
              onChange={() => setValue(option.value)}
              onClick={() => {
                if (allowDeselect && value === option.value) setValue(null);
              }}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
      <FieldError id={errorId} messages={error} />
    </fieldset>
  );
}

export function SelectField<T extends string>({
  id,
  name,
  label,
  options,
  defaultValue,
  error,
}: {
  id: string;
  name: string;
  label: string;
  options: readonly Option<T>[];
  defaultValue: T;
  error?: string[];
}) {
  return (
    <Field label={label} htmlFor={id} error={error}>
      <Select name={name} defaultValue={defaultValue}>
        <SelectTrigger id={id} className="w-full" aria-invalid={error?.length ? true : undefined}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

function toISO(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Popover calendar that always shows "26 أكتوبر 2026" with Western digits.
 * (Native date inputs follow the OS locale and may show Arabic-Indic numerals.)
 * Submits a YYYY-MM-DD value through a hidden input when `name` is set.
 */
export function DatePicker({
  id,
  name,
  defaultValue,
  value: controlledValue,
  onChange,
  clearable = false,
  placeholder = "اختر تاريخ",
  size = "default",
  min,
  max,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: {
  id: string;
  name?: string;
  defaultValue?: string | null;
  value?: string | null;
  onChange?: (value: string | null) => void;
  clearable?: boolean;
  placeholder?: string;
  size?: "default" | "sm";
  min?: string;
  max?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  const [internalValue, setInternalValue] = useState<string | null>(defaultValue ?? null);
  const [open, setOpen] = useState(false);
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const selected = value ? fromISO(value) : undefined;

  function commit(next: string | null) {
    if (controlledValue === undefined) setInternalValue(next);
    onChange?.(next);
    setOpen(false);
  }

  const disabled = [
    ...(min ? [{ before: fromISO(min) }] : []),
    ...(max ? [{ after: fromISO(max) }] : []),
  ];

  return (
    <>
      {name ? <input type="hidden" name={name} value={value ?? ""} /> : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            data-invalid={ariaInvalid || undefined}
            aria-describedby={ariaDescribedBy}
            className={cn(
              "flex w-full items-center justify-between gap-2 rounded-xl border border-input bg-paper px-3.5 text-start text-sm transition-colors outline-none hover:border-[#d6cdbd] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 data-invalid:border-destructive data-invalid:ring-3 data-invalid:ring-destructive/20",
              size === "sm" ? "h-9" : "h-11",
            )}
          >
            <span className={cn("truncate", value ? "text-ink" : "text-ink-subtle")}>
              {value ? formatDate(value) : placeholder}
            </span>
            <CalendarDays className="size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto rounded-2xl border border-line bg-paper p-2 shadow-lift">
          <Calendar
            mode="single"
            dir="rtl"
            weekStartsOn={0}
            selected={selected}
            defaultMonth={selected}
            disabled={disabled}
            onSelect={(date) => commit(date ? toISO(date) : null)}
            className="[--cell-size:--spacing(9)]"
            formatters={{
              formatCaption: (month) => `${monthLabel(toISO(month))} ${month.getFullYear()}`,
              formatDay: (date) => String(date.getDate()),
              formatWeekdayName: (date) => WEEKDAY_INITIALS[date.getDay()],
            }}
            labels={{
              labelNext: () => "الشهر الجاي",
              labelPrevious: () => "الشهر السابق",
              labelDayButton: (date, modifiers) =>
                `${formatDate(toISO(date))}${modifiers.today ? "، اليوم" : ""}${modifiers.selected ? "، محدد" : ""}`,
              labelWeekday: (date) => WEEKDAYS[date.getDay()],
            }}
          />
          <div className="flex items-center justify-between gap-2 border-t border-line px-1 pt-2">
            <Button type="button" variant="ghost" size="xs" onClick={() => commit(todayISO())}>
              اليوم
            </Button>
            {clearable && value ? (
              <Button type="button" variant="ghost" size="xs" onClick={() => commit(null)}>
                مسح
              </Button>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
