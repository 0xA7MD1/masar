import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { arSA } from "@clerk/localizations/ar-SA";

import { QueryProvider } from "@/components/providers/query-provider";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { DirectionProvider } from "@/components/ui/direction";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

const plex = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "مسار", template: "%s · مسار" },
  description: "متتبع شخصي لطلبات التوظيف — سجّل كل طلب، تابع تقدّمك، وخلك متحمّس.",
  applicationName: "مسار",
  appleWebApp: { capable: true, title: "مسار", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#F4F1E8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Every page is per user, so nothing is prerendered at build time.
export const dynamic = "force-dynamic";

/** Clerk's sign-in and sign-up cards in the app's green, font and radius. */
const clerkAppearance = {
  variables: {
    colorPrimary: "#268F86",
    colorDanger: "#FF4F2F",
    colorText: "#11110F",
    colorBackground: "#FFFDF7",
    fontFamily: "var(--font-plex), system-ui, sans-serif",
    borderRadius: "0.875rem",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" className={plex.variable}>
      <body className="antialiased">
        <ClerkProvider localization={arSA} appearance={clerkAppearance} signInUrl="/sign-in" signUpUrl="/sign-up">
          <QueryProvider>
            <DirectionProvider dir="rtl">
              <TooltipProvider delayDuration={250}>
                {children}
                <Toaster position="top-center" />
              </TooltipProvider>
            </DirectionProvider>
          </QueryProvider>
        </ClerkProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
