import type { z } from "zod";

import { GOAL_TARGET_MAX } from "./constants";
import type { backupSchema } from "./validation";

export type BackupData = z.output<typeof backupSchema>;

/**
 * What the `import_backup` database function takes: history without orphans in id order,
 * and settings resolved to one goal. Backups made before goal periods only carry weekly_goal.
 */
export function toImportPayload(data: BackupData) {
  const ids = new Set(data.applications.map((a) => a.id));
  const history = data.status_history.filter((h) => ids.has(h.application_id)).sort((a, b) => a.id - b.id);

  let settings: { display_name: string; goal_period?: string; goal_target?: number } | null = null;
  if (data.settings) {
    const { goal_period, goal_target, weekly_goal, display_name } = data.settings;
    settings = {
      display_name,
      ...(goal_period && goal_target
        ? { goal_period, goal_target: Math.min(goal_target, GOAL_TARGET_MAX[goal_period]) }
        : weekly_goal
          ? { goal_period: "week", goal_target: weekly_goal }
          : {}),
    };
  }

  return { applications: data.applications, status_history: history, settings };
}

export type ImportPayload = ReturnType<typeof toImportPayload>;
