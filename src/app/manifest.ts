import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "مسار — متتبع طلبات التوظيف",
    short_name: "مسار",
    description: "سجّل كل طلب توظيف، تابع تقدّمك، وخلك متحمّس.",
    lang: "ar",
    dir: "rtl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F4F1E8",
    theme_color: "#F4F1E8",
    categories: ["productivity", "business"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "اللوحة", url: "/board" },
      { name: "الطلبات", url: "/applications" },
    ],
  };
}
