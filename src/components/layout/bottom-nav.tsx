"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileMenu, type MobileMenuAccount } from "./mobile-menu";
import { BOTTOM_NAV_ITEMS } from "./nav-items";

/**
 * Mobilde alttan sabit, yüzen gezinme çubuğu.
 *
 * Günlük işin dört ekranı burada; geri kalanlar "Menü" ile açılan tam ekran
 * menüde. Masaüstünde gizli — orada kenar çubuğu var.
 */
export function BottomNav({ account }: { account: MobileMenuAccount }) {
  const pathname = usePathname();
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
  const onMenuPage = !BOTTOM_NAV_ITEMS.some((i) => isActive(i.href));

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
          {BOTTOM_NAV_ITEMS.map((item) => {
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
              />
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}

function NavContent({
  icon: Icon,
  label,
  active,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
}) {
  return (
    <>
      <Icon
        className={cn(
          "size-5",
          active ? "text-primary" : "text-muted-foreground",
        )}
        strokeWidth={active ? 2.25 : 1.75}
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
