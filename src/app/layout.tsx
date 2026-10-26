import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";

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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" className={plex.variable}>
      <body className="antialiased">
        <DirectionProvider dir="rtl">
          <TooltipProvider delayDuration={250}>
            {children}
            <Toaster position="top-center" />
          </TooltipProvider>
        </DirectionProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
