import type { Application, StatusChange } from "@/db/schema";

import {
  JOB_TYPE_LABELS,
  PRIORITY_META,
  SOURCE_LABELS,
  statusLabel,
  WORK_MODE_LABELS,
} from "./constants";

export function toBackup(
  apps: Application[],
  history: StatusChange[],
  settings: { weeklyGoal: number; displayName: string },
) {
  return {
    app: "masar" as const,
    version: 1 as const,
    exported_at: new Date().toISOString(),
    settings: { weekly_goal: settings.weeklyGoal, display_name: settings.displayName },
    applications: apps.map((a) => ({
      id: a.id,
      created_at: a.createdAt.toISOString(),
      updated_at: a.updatedAt.toISOString(),
      job_title: a.jobTitle,
      company: a.company,
      source: a.source,
      job_type: a.jobType,
      work_mode: a.workMode,
      location: a.location,
      job_url: a.jobUrl,
      applied_date: a.appliedDate,
      status: a.status,
      expected_salary: a.expectedSalary,
      cv_tailored: a.cvTailored,
      next_follow_up: a.nextFollowUp,
      priority: a.priority,
      notes: a.notes,
    })),
    status_history: history.map((h) => ({
      id: h.id,
      application_id: h.applicationId,
      from_status: h.fromStatus,
      to_status: h.toStatus,
      changed_at: h.changedAt.toISOString(),
    })),
  };
}

function csvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** CSV with Arabic headers and labels; the BOM makes Excel read it as UTF-8. */
export function toCsv(apps: Application[]): string {
  const header = [
    "المعرّف",
    "المسمى الوظيفي",
    "الشركة",
    "المصدر",
    "نوع الوظيفة",
    "طريقة العمل",
    "الموقع",
    "رابط الوظيفة",
    "تاريخ التقديم",
    "الحالة",
    "الراتب المتوقع",
    "سيرة معدّلة",
    "المتابعة القادمة",
    "الأولوية",
    "ملاحظات",
    "أُنشئ في",
    "آخر تحديث",
  ];
  const rows = apps.map((a) => [
    a.id,
    a.jobTitle,
    a.company,
    SOURCE_LABELS[a.source],
    a.jobType ? JOB_TYPE_LABELS[a.jobType] : "",
    a.workMode ? WORK_MODE_LABELS[a.workMode] : "",
    a.location,
    a.jobUrl,
    a.appliedDate,
    statusLabel(a.status, false),
    a.expectedSalary,
    a.cvTailored ? "نعم" : "لا",
    a.nextFollowUp,
    PRIORITY_META[a.priority].label,
    a.notes,
    a.createdAt.toISOString(),
    a.updatedAt.toISOString(),
  ]);
  return "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
}
