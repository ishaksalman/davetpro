import {
  PackageCheck,
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  CalendarCheck,
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
  /** Mobil menü karolarında adın altındaki kısa açıklama. */
  description?: string;
  /** Finans yetkisi olmayan personele gösterilmez (RLS zaten veriyi de gizler). */
  financeOnly?: boolean;
  /** Yalnızca teslim akışı kullanan işletmelerde görünür. */
  deliveryOnly?: boolean;
  /** Yalnızca ekip kavramı olan işletmelerde görünür (fotoğrafçı). */
  teamsOnly?: boolean;
  /** Yalnızca kısıtlı kaynak (salon / mekân) gösterilen işletmelerde görünür. */
  resourceOnly?: boolean;
};

export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Genel",
    items: [
      { href: "/panel", label: "Dashboard", icon: LayoutDashboard },
      { href: "/takvim", label: "Takvim", icon: CalendarDays },
      { href: "/rezervasyonlar", label: "Rezervasyonlar", icon: CalendarCheck },
      { href: "/teslimat", label: "Teslimat", icon: PackageCheck, deliveryOnly: true, description: "Baskı ve teslim takibi" },
      { href: "/musteriler", label: "Müşteriler", icon: Users },
      { href: "/talepler", label: "Talepler", icon: MessagesSquare, description: "Görüşmeler ve teklifler" },
    ],
  },
  {
    label: "Finans",
    items: [
      { href: "/gelirler", label: "Gelirler", icon: ArrowDownCircle, financeOnly: true, description: "Tahsilatlar" },
      { href: "/giderler", label: "Giderler", icon: ArrowUpCircle, financeOnly: true, description: "Ödemeler ve masraflar" },
      { href: "/raporlar", label: "Raporlar", icon: BarChart3, financeOnly: true, description: "Kârlılık ve nakit akışı" },
    ],
  },
  {
    label: "Tanımlar",
    items: [
      { href: "/paketler", label: "Paketler", icon: Package, description: "Fiyat ve hizmetler" },
      { href: "/salonlar", label: "Salonlar", icon: Store, resourceOnly: true, description: "Kapasite ve takvim rengi" },
      { href: "/ekipler", label: "Ekipler", icon: UsersRound, teamsOnly: true, description: "Çekim ekipleri" },
      { href: "/ayarlar", label: "Ayarlar", icon: Settings, description: "İşletme ve kullanıcılar" },
    ],
  },
];

/** Yetki ve iş tipine göre görünen menü öğeleri — iki menü de bunu kullanıyor. */
export function visibleNavItems(
  items: NavItem[],
  flags: {
    showFinance: boolean;
    usesDelivery: boolean;
    usesTeams: boolean;
    usesResource: boolean;
  },
): NavItem[] {
  return items.filter(
    (i) =>
      (flags.showFinance || !i.financeOnly) &&
      (flags.usesDelivery || !i.deliveryOnly) &&
      (flags.usesTeams || !i.teamsOnly) &&
      (flags.usesResource || !i.resourceOnly),
  );
}

/**
 * Mobil alt çubuktaki sekmeler. Mobilde kenar çubuğu bunları tekrar
 * listelemiyor; iki menü bu tek listeden besleniyor ki birbirinden kopmasın.
 */
const BOTTOM_BASE: NavItem[] = [
  { href: "/panel", label: "Panel", icon: LayoutDashboard },
  { href: "/takvim", label: "Takvim", icon: CalendarDays },
  { href: "/rezervasyonlar", label: "Rezervasyon", icon: CalendarCheck },
];

/**
 * Dördüncü sekme işe göre: fotoğrafçıda Teslimat (günlük işi çekim sonrası
 * takip), salonda Müşteriler. Dışarıda kalan, tam ekran menüde görünüyor.
 */
export function bottomNavItems(usesDelivery: boolean): NavItem[] {
  return [
    ...BOTTOM_BASE,
    usesDelivery
      ? { href: "/teslimat", label: "Teslimat", icon: PackageCheck }
      : { href: "/musteriler", label: "Müşteriler", icon: Users },
  ];
}
