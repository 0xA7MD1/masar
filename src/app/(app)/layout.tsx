import { redirect } from "next/navigation";

import { CelebrationProvider } from "@/components/celebrate/celebration-provider";
import { BottomNav, QuickAddFab, TopNav } from "@/components/nav/app-nav";
import { QuickAddProvider } from "@/components/quick-add/quick-add-provider";
import { isAuthenticated } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // The middleware already guards these routes; this keeps a misconfigured matcher from leaking data.
  if (!(await isAuthenticated())) redirect("/login");

  return (
    <CelebrationProvider>
      <QuickAddProvider>
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
      </QuickAddProvider>
    </CelebrationProvider>
  );
}
