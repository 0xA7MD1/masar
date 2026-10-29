import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type Supabase = SupabaseClient;

/**
 * A Supabase client that sends the signed-in user's Clerk session token with every request.
 * Supabase verifies it (Third-Party Auth) and the row level security policies match its `sub`.
 * Without a token, requests run as `anon`, which has no access to any table.
 */
export function createSupabase(accessToken: () => Promise<string | null>): Supabase {
  // Written out in full so Next.js inlines them into the browser bundle.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set.");
  }
  return createClient(url, key, { accessToken });
}
