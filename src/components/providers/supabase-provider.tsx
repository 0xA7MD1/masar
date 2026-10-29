"use client";

import { createContext, useContext, useState } from "react";
import { useAuth } from "@clerk/nextjs";

import { createSupabase, type Supabase } from "@/lib/supabase/client";

const SupabaseContext = createContext<Supabase | null>(null);

/** One browser client for the signed-in pages. Clerk's getToken waits for Clerk to load and refreshes the token. */
export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  const [client] = useState(() => createSupabase(() => getToken()));
  return <SupabaseContext value={client}>{children}</SupabaseContext>;
}

export function useSupabase(): Supabase {
  const client = useContext(SupabaseContext);
  if (!client) throw new Error("useSupabase must be used inside <SupabaseProvider>.");
  return client;
}
