import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { CelebrationHost } from "@/components/celebrate/celebration-host";
import { BottomNav, QuickAddFab, TopNav } from "@/components/nav/app-nav";
import { SupabaseProvider } from "@/components/providers/supabase-provider";
import { QuickAddSheet } from "@/components/quick-add/quick-add-sheet";
import { getSettings, listApplications, listHistory } from "@/lib/data/reads";
import { makeQueryClient } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/user";

export const dynamic = "force-dynamic";

/**
 * Prefetches the data every page shares. Layouts don't re-render on client navigation,
 * so moving between pages reads the hydrated cache instead of hitting the database again.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // The middleware already guards these routes; without a user there is no token to read with.
  await requireUserId();
  const supabase = await createServerSupabase();

  const queryClient = makeQueryClient();
  await Promise.all([
    queryClient.prefetchQuery({ queryKey: queryKeys.applications, queryFn: () => listApplications(supabase) }),
    queryClient.prefetchQuery({ queryKey: queryKeys.history, queryFn: () => listHistory(supabase) }),
    queryClient.prefetchQuery({ queryKey: queryKeys.settings, queryFn: () => getSettings(supabase) }),
  ]);

  return (
    <SupabaseProvider>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <a href="#main" className="skip-link">
          تخطَّ إلى المحتوى
        </a>
        <TopNav />
        <main
          id="main"
          className="mx-auto w-full max-w-6xl px-4 pt-6 pb-[calc(7.5rem+env(safe-area-inset-bottom))] md:px-8 md:pt-10 md:pb-20"
        >
          {children}
        </main>
        <BottomNav />
        <QuickAddFab />
        <QuickAddSheet />
        <CelebrationHost />
      </HydrationBoundary>
    </SupabaseProvider>
  );
}
