"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, type LucideIcon } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { BOTTOM_NAV_ITEMS } from "./nav-items";

/**
 * Mobilde alttan sabit, yüzen gezinme çubuğu.
 *
 * Günlük işin dört ekranı burada; geri kalanlar "Menü" ile açılan kenar
 * çubuğunda. Kenar çubuğu mobilde bu dördünü tekrar listelemiyor — ikisi
 * de BOTTOM_NAV_ITEMS'tan besleniyor. Masaüstünde gizli.
 */
export function BottomNav() {
  const pathname = usePathname();
  const { setOpenMobile, openMobile } = useSidebar();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  // Çubukta olmayan bir sayfadaysak (ör. Gelirler) Menü etkin görünüyor.
  const onMenuPage = !BOTTOM_NAV_ITEMS.some((i) => isActive(i.href));

  return (
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
                className="flex h-full flex-col items-center justify-center gap-1"
              >
                <NavContent icon={item.icon} label={item.label} active={active} />
              </Link>
            </li>
          );
        })}
        <li className="flex-1">
          <button
            type="button"
            onClick={() => setOpenMobile(true)}
            aria-expanded={openMobile}
            className="flex h-full w-full flex-col items-center justify-center gap-1"
          >
            <NavContent icon={Menu} label="Menü" active={onMenuPage} />
          </button>
        </li>
      </ul>
    </nav>
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
        className={cn("size-5", active ? "text-primary" : "text-muted-foreground")}
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
