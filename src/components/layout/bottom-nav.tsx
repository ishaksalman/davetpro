"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
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
                label={menuOpen ? "Kapat" : "Menü"}
                active={menuOpen || onMenuPage}
                hasInterior={false}
              />
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}

/** Etkin sekmenin iç dolgusu. Çizgi (kenar) rengi pasifle aynı kalıyor. */
const ACTIVE_FILL = "#16E0B4";

/**
 * `hasInterior`: simgenin içi doldurulabilir mi. Menü / Kapat yalnızca
 * çizgiden oluşuyor; dolacak bir alanı yok, etkinken çizgi rengi değişiyor.
 */
function NavContent({
  icon: Icon,
  label,
  active,
  hasInterior = true,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  hasInterior?: boolean;
}) {
  return (
    <>
      <Icon
        className={cn(
          "size-6",
          active && !hasInterior ? "text-[#16E0B4]" : "text-muted-foreground",
        )}
        strokeWidth={1.75}
        fill={active && hasInterior ? ACTIVE_FILL : "none"}
      />
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
