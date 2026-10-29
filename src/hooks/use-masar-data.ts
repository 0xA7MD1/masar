"use client";

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";

import { useSupabase } from "@/components/providers/supabase-provider";
import type { Application } from "@/db/schema";
import type { Status } from "@/lib/constants";
import {
  appliedDateAfterMove,
  createApplication,
  deleteApplication,
  importBackup,
  updateApplication,
  updateApplicationStatus,
  updateSettings,
} from "@/lib/data/mutations";
import { getApplicationDetail, getSettings, listApplications, listHistory } from "@/lib/data/reads";
import { todayISO } from "@/lib/dates";
import { queryKeys } from "@/lib/query-keys";

// Everything here talks to Supabase from the browser with the user's Clerk token. Queries are
// prefetched by server components and hydrated, so these never suspend on first paint.

export function useApplications() {
  const supabase = useSupabase();
  return useSuspenseQuery({ queryKey: queryKeys.applications, queryFn: () => listApplications(supabase) }).data;
}

export function useHistory() {
  const supabase = useSupabase();
  return useSuspenseQuery({ queryKey: queryKeys.history, queryFn: () => listHistory(supabase) }).data;
}

export function useSettings() {
  const supabase = useSupabase();
  return useSuspenseQuery({ queryKey: queryKeys.settings, queryFn: () => getSettings(supabase) }).data;
}

export function useApplicationDetail(id: number) {
  const supabase = useSupabase();
  return useSuspenseQuery({
    queryKey: queryKeys.application(id),
    queryFn: () => getApplicationDetail(supabase, id),
  }).data;
}

/** Thrown from mutations that answered `{ ok: false }`, so rollbacks run. */
export class ActionError extends Error {}

function useInvalidateApplications() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      // Prefix match: the list and every cached detail page.
      queryClient.invalidateQueries({ queryKey: queryKeys.applications }),
      queryClient.invalidateQueries({ queryKey: queryKeys.history }),
    ]);
}

export function useCreateApplication() {
  const supabase = useSupabase();
  const invalidate = useInvalidateApplications();
  return useMutation({
    mutationFn: (formData: FormData) => createApplication(supabase, formData),
    onSuccess: (result) => {
      if (result.ok) void invalidate();
    },
  });
}

export function useUpdateApplication(id: number) {
  const supabase = useSupabase();
  const invalidate = useInvalidateApplications();
  return useMutation({
    mutationFn: (formData: FormData) => updateApplication(supabase, id, formData),
    onSuccess: (result) => {
      if (result.ok) void invalidate();
    },
  });
}

/** Status change with an optimistic update, used by the kanban drag and the quick actions. */
export function useMoveApplication() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateApplications();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: Status }) => {
      const result = await updateApplicationStatus(supabase, id, status);
      if (!result.ok) throw new ActionError(result.error);
      return result.data;
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.applications, exact: true });
      const previous = queryClient.getQueryData<Application[]>(queryKeys.applications);
      const today = todayISO();
      queryClient.setQueryData<Application[]>(queryKeys.applications, (apps) =>
        apps?.map((app) =>
          app.id === id
            ? {
                ...app,
                status,
                appliedDate: appliedDateAfterMove(app, status, today),
                updatedAt: new Date(),
              }
            : app,
        ),
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.applications, context.previous);
    },
    onSettled: () => invalidate(),
  });
}

export function useDeleteApplication() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateApplications();
  return useMutation({
    mutationFn: (id: number) => deleteApplication(supabase, id),
    onSuccess: (result, id) => {
      if (!result.ok) return;
      queryClient.setQueryData<Application[]>(queryKeys.applications, (apps) => apps?.filter((app) => app.id !== id));
      void invalidate();
    },
  });
}

export function useUpdateSettings() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => updateSettings(supabase, formData),
    onSuccess: (result) => {
      if (result.ok) void queryClient.invalidateQueries({ queryKey: queryKeys.settings });
    },
  });
}

export function useImportBackup() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => importBackup(supabase, data),
    onSuccess: (result) => {
      if (result.ok) void queryClient.invalidateQueries({ queryKey: queryKeys.all });
    },
  });
}
