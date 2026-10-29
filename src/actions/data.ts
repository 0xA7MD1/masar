"use server";

import { getApplicationDetail, getSettings, listApplications, listHistory } from "@/lib/queries";
import { currentUserId, UnauthorizedError } from "@/lib/user";
import { idSchema } from "@/lib/validation";

// Read endpoints for TanStack Query on the client. Server components call lib/queries directly.

async function userIdOrThrow(): Promise<string> {
  const userId = await currentUserId();
  if (!userId) throw new UnauthorizedError();
  return userId;
}

export async function fetchApplications() {
  return listApplications(await userIdOrThrow());
}

export async function fetchHistory() {
  return listHistory(await userIdOrThrow());
}

export async function fetchSettings() {
  return getSettings(await userIdOrThrow());
}

export async function fetchApplicationDetail(id: number) {
  const userId = await userIdOrThrow();
  const parsed = idSchema.safeParse(id);
  return parsed.success ? getApplicationDetail(userId, parsed.data) : null;
}
