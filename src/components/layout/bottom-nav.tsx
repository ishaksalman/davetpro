"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CalendarCheckFilled,
  CalendarFilled,
  CloseFilled,
  MenuFilled,
  PackageFilled,
  PanelFilled,
  UsersFilled,
} from "./filled-nav-icons";
import { MobileMenu, type MobileMenuAccount } from "./mobile-menu";
import { bottomNavItems } from "./nav-items";
import { useVertical } from "./vertical-provider";

/**
 * Mobilde alttan sabit, yüzen gezinme çubuğu.
 *
 * Günlük işin dört ekranı burada; geri kalanlar "Menü" ile açılan tam ekran
 * menüde. Masaüstünde gizli — orada kenar çubuğu var.
 */
export function BottomNav({ account }: { account: MobileMenuAccount }) {
  const pathname = usePathname();
  const items = bottomNavItems(useVertical().usesDelivery);
  /*
   * Menü hangi sayfada açıldıysa o sayfaya bağlı: gezinince kendiliğinden
   * kapanıyor. Rotayı izleyip efektte kapatmaya gerek kalmıyor.
   */
  const [menuAt, setMenuAt] = useState<string | null>(null);
  const menuOpen = menuAt === pathname;
  const closeMenu = useCallback(() => setMenuAt(null), []);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  // Çubukta olmayan bir sayfadaysak (ör. Gelirler) Menü etkin görünüyor.
  const onMenuPage = !items.some((i) => isActive(i.href));

  return (
    <>
      <MobileMenu
        open={menuOpen}
        onClose={closeMenu}
        pathname={pathname}
        account={account}
      />
      <BrandGradientDefs />
      <nav
        aria-label="Ana gezinme"
        className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 md:hidden"
      >
        <ul className="flex h-16 rounded-[1.75rem] bg-card shadow-[0_4px_18px_rgb(0_0_0/0.12)] ring-1 ring-foreground/5 dark:shadow-[0_4px_18px_rgb(0_0_0/0.45)]">
          {items.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={closeMenu}
                  className="flex h-full flex-col items-center justify-center gap-1"
                >
                  <NavContent
                    icon={item.icon}
                    filled={FILLED[item.href]}
                    label={item.label}
                    active={active && !menuOpen}
                  />
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMenuAt(menuOpen ? null : pathname)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              className="flex h-full w-full flex-col items-center justify-center gap-1"
            >
              <NavContent
                icon={menuOpen ? X : Menu}
                filled={menuOpen ? CloseFilled : MenuFilled}
                label={menuOpen ? "Kapat" : "Menü"}
                active={menuOpen || onMenuPage}
              />
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}

const GRADIENT_ID = "alt-menu-marka-degradesi";
const GRADIENT = `url(#${GRADIENT_ID})`;

type FilledIcon = (props: { fill: string; className?: string }) => React.ReactNode;

/** Etkin sekmede çizgi simge yerine dolu karşılığı. */
const FILLED: Record<string, FilledIcon> = {
  "/panel": PanelFilled,
  "/takvim": CalendarFilled,
  "/rezervasyonlar": CalendarCheckFilled,
  "/musteriler": UsersFilled,
  "/teslimat": PackageFilled,
};

/**
 * Etkin sekme simgesini dolduran marka degradesi. Bir kez
 * tanımlanıyor, simgeler url(#…) ile kullanıyor.
 *
 * userSpaceOnUse: degrade simgenin 24×24 alanına yayılıyor. Varsayılan
 * (objectBoundingBox) her çizgiyi ayrı ölçüyor; "Menü" simgesindeki gibi
 * düz çizgilerin yüksekliği sıfır olduğu için degrade hiç çizilmiyordu.
 */
function BrandGradientDefs() {
  return (
    <svg aria-hidden width="0" height="0" className="absolute">
      <defs>
        <linearGradient id={GRADIENT_ID} gradientUnits="userSpaceOnUse" x1="2" y1="2" x2="22" y2="22">
          <stop offset="0%" stopColor="#1a5cff" />
          <stop offset="55%" stopColor="#0fbfd8" />
          <stop offset="100%" stopColor="#16e0b4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function NavContent({
  icon: Icon,
  filled: Filled,
  label,
  active,
}: {
  icon: LucideIcon;
  filled: FilledIcon;
  label: string;
  active: boolean;
}) {
  return (
    <>
      {active ? (
        <Filled fill={GRADIENT} className="size-6" />
      ) : (
        <Icon className="size-6 text-muted-foreground" strokeWidth={1.75} />
      )}
      <span
        className={cn(
          "text-[11px] leading-none",
          active ? "font-semibold text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
    </>
  );
}
