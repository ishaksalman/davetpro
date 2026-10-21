import {
  PackageCheck,
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
  UsersRound,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Finans yetkisi olmayan personele gösterilmez (RLS zaten veriyi de gizler). */
  financeOnly?: boolean;
  /** Yalnızca teslim akışı kullanan işletmelerde görünür. */
  deliveryOnly?: boolean;
  /** Yalnızca ekip kavramı olan işletmelerde görünür (fotoğrafçı). */
  teamsOnly?: boolean;
};

export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Genel",
    items: [
      { href: "/panel", label: "Dashboard", icon: LayoutDashboard },
      { href: "/takvim", label: "Takvim", icon: CalendarDays },
      { href: "/rezervasyonlar", label: "Rezervasyonlar", icon: Store },
      { href: "/musteriler", label: "Müşteriler", icon: Users },
      { href: "/talepler", label: "Talepler", icon: MessagesSquare },
      { href: "/teslimat", label: "Teslimat", icon: PackageCheck, deliveryOnly: true },
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
      { href: "/ekipler", label: "Ekipler", icon: UsersRound, teamsOnly: true },
      { href: "/ayarlar", label: "Ayarlar", icon: Settings },
    ],
  },
];

/**
 * Mobil alt çubuktaki sekmeler. Mobilde kenar çubuğu bunları tekrar
 * listelemiyor; iki menü bu tek listeden besleniyor ki birbirinden kopmasın.
 */
export const BOTTOM_NAV_ITEMS: NavItem[] = [
  { href: "/panel", label: "Panel", icon: LayoutDashboard },
  { href: "/takvim", label: "Takvim", icon: CalendarDays },
  { href: "/rezervasyonlar", label: "Rezervasyon", icon: Store },
  { href: "/musteriler", label: "Müşteriler", icon: Users },
];
