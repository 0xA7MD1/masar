import type { Application, StatusChange } from "@/db/schema";

import type { ApplicationValues } from "../validation";

// The Data API speaks the table's snake_case columns with ISO timestamps; the components use
// the Drizzle row shape (camelCase, Date). These convert at the edge, so nothing else changes.

export type ApplicationRow = {
  id: number;
  user_id: string;
  created_at: string;
  updated_at: string;
  job_title: string;
  company: string;
  source: Application["source"];
  job_type: Application["jobType"];
  work_mode: Application["workMode"];
  location: string | null;
  job_url: string | null;
  applied_date: string;
  status: Application["status"];
  expected_salary: string | null;
  cv_tailored: boolean;
  next_follow_up: string | null;
  priority: Application["priority"];
  notes: string | null;
  follow_up_url: string | null;
};

export type StatusChangeRow = {
  id: number;
  user_id: string;
  application_id: number;
  from_status: StatusChange["fromStatus"];
  to_status: StatusChange["toStatus"];
  changed_at: string;
};

export type SettingsRow = { goal_period: "day" | "week" | "month"; goal_target: number; display_name: string };

export function toApplication(row: ApplicationRow): Application {
  return {
    id: row.id,
    userId: row.user_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    jobTitle: row.job_title,
    company: row.company,
    source: row.source,
    jobType: row.job_type,
    workMode: row.work_mode,
    location: row.location,
    jobUrl: row.job_url,
    appliedDate: row.applied_date,
    status: row.status,
    expectedSalary: row.expected_salary,
    cvTailored: row.cv_tailored,
    nextFollowUp: row.next_follow_up,
    priority: row.priority,
    notes: row.notes,
    followUpUrl: row.follow_up_url,
  };
}

export function toStatusChange(row: StatusChangeRow): StatusChange {
  return {
    id: row.id,
    userId: row.user_id,
    applicationId: row.application_id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    changedAt: new Date(row.changed_at),
  };
}

/** The columns a form writes. `user_id` comes from the token and the timestamps from the table. */
export function toApplicationColumns(values: ApplicationValues & { appliedDate: string }) {
  return {
    job_title: values.jobTitle,
    company: values.company,
    source: values.source,
    job_type: values.jobType,
    work_mode: values.workMode,
    location: values.location,
    job_url: values.jobUrl,
    applied_date: values.appliedDate,
    status: values.status,
    expected_salary: values.expectedSalary,
    cv_tailored: values.cvTailored,
    next_follow_up: values.nextFollowUp,
    priority: values.priority,
    notes: values.notes,
    follow_up_url: values.followUpUrl,
  } satisfies Partial<ApplicationRow>;
}
