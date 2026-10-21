"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  LayoutDashboard,
  Menu,
  MessagesSquare,
  Store,
  type LucideIcon,
} from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/panel", label: "Panel", icon: LayoutDashboard },
  { href: "/takvim", label: "Takvim", icon: CalendarDays },
  { href: "/rezervasyonlar", label: "Rezervasyon", icon: Store },
  { href: "/talepler", label: "Talepler", icon: MessagesSquare },
];

/**
 * Mobilde alttan sabit gezinme çubuğu.
 *
 * Günlük işin dört ekranı burada; geri kalan her şey (müşteriler, finans,
 * tanımlar, hesap) "Menü" ile açılan kenar çubuğunda. Kenar çubuğu tek
 * kaynak kalıyor — ikinci bir menü listesi tutulmuyor.
 *
 * Masaüstünde gizli: orada kenar çubuğu sürekli açık.
 */
export function BottomNav() {
  const pathname = usePathname();
  const { setOpenMobile, openMobile } = useSidebar();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  const onMenuPage = !ITEMS.some((i) => isActive(i.href));

  return (
    <nav
      aria-label="Ana gezinme"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
    >
      <ul className="grid h-16 grid-cols-5">
        {ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="flex h-full flex-col items-center justify-center gap-1"
              >
                <NavIcon icon={item.icon} active={active} />
                <span
                  className={cn(
                    "text-[11px] leading-none",
                    active ? "font-semibold text-foreground" : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={() => setOpenMobile(true)}
            aria-expanded={openMobile}
            className="flex h-full w-full flex-col items-center justify-center gap-1"
          >
            {/* Alt çubukta olmayan bir sayfadaysak (ör. Müşteriler) Menü
                etkin görünüyor; kullanıcı nerede olduğunu kaybetmesin. */}
            <NavIcon icon={Menu} active={onMenuPage} />
            <span
              className={cn(
                "text-[11px] leading-none",
                onMenuPage ? "font-semibold text-foreground" : "text-muted-foreground",
              )}
            >
              Menü
            </span>
          </button>
        </li>
      </ul>
    </nav>
  );
}

function NavIcon({ icon: Icon, active }: { icon: LucideIcon; active: boolean }) {
  return (
    <span
      className={cn(
        "grid h-7 w-12 place-items-center rounded-full transition-colors",
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground",
      )}
    >
      <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
    </span>
  );
}
