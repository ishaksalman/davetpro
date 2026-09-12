import {
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  CalendarDays,
  LayoutDashboard,
  MessagesSquare,
  type LucideIcon,
  Package,
  Settings,
  Store,
  Users,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Finans yetkisi olmayan personele gösterilmez (RLS zaten veriyi de gizler). */
  financeOnly?: boolean;
};

export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Genel",
    items: [
      { href: "/panel", label: "Dashboard", icon: LayoutDashboard },
      { href: "/takvim", label: "Takvim", icon: CalendarDays },
      { href: "/talepler", label: "Talepler", icon: MessagesSquare },
      { href: "/rezervasyonlar", label: "Rezervasyonlar", icon: Store },
      { href: "/musteriler", label: "Müşteriler", icon: Users },
    ],
  },
  {
    label: "Finans",
    items: [
      { href: "/gelirler", label: "Gelirler", icon: ArrowDownCircle, financeOnly: true },
      { href: "/giderler", label: "Giderler", icon: ArrowUpCircle, financeOnly: true },
      { href: "/raporlar", label: "Raporlar", icon: BarChart3, financeOnly: true },
    ],
  },
  {
    label: "Tanımlar",
    items: [
      { href: "/paketler", label: "Paketler", icon: Package },
      { href: "/salonlar", label: "Salonlar", icon: Store },
      { href: "/ayarlar", label: "Ayarlar", icon: Settings },
    ],
  },
];
