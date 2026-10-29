"use client";

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";

import { createApplication, deleteApplication, updateApplication, updateApplicationStatus } from "@/actions/applications";
import { fetchApplicationDetail, fetchApplications, fetchHistory, fetchSettings } from "@/actions/data";
import { importBackup, updateSettings } from "@/actions/settings";
import type { Application } from "@/db/schema";
import type { Status } from "@/lib/constants";
import { todayISO } from "@/lib/dates";
import { queryKeys } from "@/lib/query-keys";

// Queries are prefetched by server components and hydrated, so these never suspend on first paint.

export function useApplications() {
  return useSuspenseQuery({ queryKey: queryKeys.applications, queryFn: () => fetchApplications() }).data;
}

export function useHistory() {
  return useSuspenseQuery({ queryKey: queryKeys.history, queryFn: () => fetchHistory() }).data;
}

export function useSettings() {
  return useSuspenseQuery({ queryKey: queryKeys.settings, queryFn: () => fetchSettings() }).data;
}

export function useApplicationDetail(id: number) {
  return useSuspenseQuery({ queryKey: queryKeys.application(id), queryFn: () => fetchApplicationDetail(id) }).data;
}

/** Thrown from mutations whose server action answered `{ ok: false }`, so rollbacks run. */
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
  const invalidate = useInvalidateApplications();
  return useMutation({
    mutationFn: (formData: FormData) => createApplication(formData),
    onSuccess: (result) => {
      if (result.ok) void invalidate();
    },
  });
}

export function useUpdateApplication(id: number) {
  const invalidate = useInvalidateApplications();
  return useMutation({
    mutationFn: (formData: FormData) => updateApplication(id, formData),
    onSuccess: (result) => {
      if (result.ok) void invalidate();
    },
  });
}

/** Status change with an optimistic update, used by the kanban drag and the quick actions. */
export function useMoveApplication() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateApplications();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: Status }) => {
      const result = await updateApplicationStatus(id, status);
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
                // Same rule as the server: a bookmark moved into the pipeline was applied today.
                appliedDate: app.status === "saved" && status !== "saved" ? today : app.appliedDate,
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
  const queryClient = useQueryClient();
  const invalidate = useInvalidateApplications();
  return useMutation({
    mutationFn: (id: number) => deleteApplication(id),
    onSuccess: (result, id) => {
      if (!result.ok) return;
      queryClient.setQueryData<Application[]>(queryKeys.applications, (apps) => apps?.filter((app) => app.id !== id));
      void invalidate();
    },
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => updateSettings(formData),
    onSuccess: (result) => {
      if (result.ok) void queryClient.invalidateQueries({ queryKey: queryKeys.settings });
    },
  });
}

export function useImportBackup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => importBackup(data),
    onSuccess: (result) => {
      if (result.ok) void queryClient.invalidateQueries({ queryKey: queryKeys.all });
    },
  });
}
