import { ChartColumnBig, House, Rows3, Settings2, SquareKanban, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "الرئيسية", icon: House },
  { href: "/board", label: "اللوحة", icon: SquareKanban },
  { href: "/applications", label: "الطلبات", icon: Rows3 },
  { href: "/stats", label: "الإحصائيات", icon: ChartColumnBig },
  { href: "/settings", label: "الإعدادات", icon: Settings2 },
];

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
