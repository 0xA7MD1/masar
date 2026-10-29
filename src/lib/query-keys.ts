// Every TanStack Query key in the app. Invalidating `all` refreshes everything.
export const queryKeys = {
  all: ["masar"] as const,
  applications: ["masar", "applications"] as const,
  application: (id: number) => ["masar", "applications", id] as const,
  history: ["masar", "history"] as const,
  settings: ["masar", "settings"] as const,
};
