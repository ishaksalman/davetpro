"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { CalendarClock, KeyRound, LogOut, ShieldCheck, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BrandIcon } from "@/components/brand/logo";
import { USER_ROLE_LABELS } from "@/lib/constants";
import { initials } from "@/lib/format";
import type { Business, Profile } from "@/lib/database.types";
import type { SubscriptionInfo } from "@/lib/subscription";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/(auth)/actions";
import { ChangePasswordDialog } from "./change-password-dialog";
import { BOTTOM_NAV_ITEMS, NAV_GROUPS, visibleNavItems, type NavItem } from "./nav-items";
import { useVertical } from "./vertical-provider";

/** Grup başına simge rengi — karoları göz gezdirirken ayırmak için. */
const GROUP_TONES: Record<string, string> = {
  Genel: "bg-chart-1/12 text-chart-1",
  Finans: "bg-chart-2/12 text-chart-2",
  Tanımlar: "bg-chart-4/15 text-chart-4",
};

export type MobileMenuAccount = {
  profile: Profile;
  business: Business;
  email: string;
  showFinance: boolean;
  isPlatformAdmin: boolean;
  subscription: SubscriptionInfo | null;
  canManageBilling: boolean;
};

/**
 * Mobilde "Menü" ile açılan tam ekran menü.
 *
 * Alt çubuğun altında kalıyor (z-30 < z-40): çubuk görünür, başka bir
 * sekmeye basınca doğrudan o sayfaya gidiliyor, "Menü"ye tekrar basınca
 * kapanıyor. Çubuktaki dört bölüm burada tekrar edilmiyor.
 */
export function MobileMenu({
  open,
  onClose,
  pathname,
  account,
}: {
  open: boolean;
  onClose: () => void;
  pathname: string;
  account: MobileMenuAccount;
}) {
  const sozluk = useVertical();
  const closeRef = useRef<HTMLButtonElement>(null);
  const { profile, business, email, subscription } = account;

  // Açıkken arka sayfa kaymasın, Esc kapatsın, odak menüye geçsin.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  const groups = NAV_GROUPS.map((group) => ({
    label: group.label,
    items: visibleNavItems(group.items, {
      showFinance: account.showFinance,
      usesDelivery: sozluk.usesDelivery,
      usesTeams: sozluk.usesTeams,
    }).filter((i) => !BOTTOM_NAV_ITEMS.some((b) => b.href === i.href)),
  })).filter((g) => g.items.length > 0);
  const abonelikGoster = subscription && account.canManageBilling;

  return (
    <div
      id="mobile-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Menü"
      className="fixed inset-0 z-30 animate-in overflow-y-auto bg-background duration-200 fade-in-0 slide-in-from-bottom-4 motion-reduce:animate-none md:hidden"
    >
      <div className="mx-auto max-w-lg px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
        <header className="flex items-center gap-3">
          <BrandIcon className="size-9 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold leading-tight">{business.name}</p>
            <p className="text-xs text-muted-foreground">DavetPro</p>
          </div>
          <Button
            ref={closeRef}
            variant="secondary"
            size="icon"
            className="size-10 rounded-full"
            onClick={onClose}
            aria-label="Menüyü kapat"
          >
            <X />
          </Button>
        </header>

        <section className="mt-5 rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <Avatar className="size-11 rounded-xl">
              <AvatarFallback className="rounded-xl bg-primary/10 text-sm font-semibold text-primary">
                {initials(profile.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-medium">{profile.full_name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {USER_ROLE_LABELS[profile.role]} · {email}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <ChangePasswordDialog
              trigger={
                <Button variant="outline" size="sm">
                  <KeyRound />
                  Şifre değiştir
                </Button>
              }
            />
            {abonelikGoster && (
              <Button asChild variant="outline" size="sm">
                <Link href="/abonelik">
                  <CalendarClock />
                  Abonelik
                  {subscription.daysLeft <= 60 && (
                    <span className="text-xs text-muted-foreground">
                      · {subscription.daysLeft === 0 ? "bugün" : `${subscription.daysLeft} gün`}
                    </span>
                  )}
                </Link>
              </Button>
            )}
          </div>
        </section>

        {groups.map((group) => (
          <section key={group.label} className="mt-6">
            <h2 className="mb-2 px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {group.label}
            </h2>
            <ul className="grid grid-cols-2 gap-3">
              {group.items.map((item, i) => (
                <Tile
                  key={item.href}
                  item={item}
                  tone={GROUP_TONES[group.label]}
                  // Tek kalan karo yarım satırda boşluk bırakmasın.
                  wide={i === group.items.length - 1 && group.items.length % 2 === 1}
                  label={item.href === "/salonlar" ? sozluk.resource.plural : item.label}
                  active={isActive(item.href)}
                  onNavigate={onClose}
                />
              ))}
            </ul>
          </section>
        ))}

        {account.isPlatformAdmin && (
          <section className="mt-6">
            <h2 className="mb-2 px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Platform
            </h2>
            <ul className="grid grid-cols-2 gap-3">
              <Tile
                wide
                item={{ href: "/yonetim", label: "Abonelikler", icon: ShieldCheck, description: "İşletmeler ve ödemeler" }}
                label="Abonelikler"
                active={isActive("/yonetim")}
                onNavigate={onClose}
              />
            </ul>
          </section>
        )}

        <form action={logoutAction} className="mt-8">
          <Button type="submit" variant="ghost" className="w-full text-destructive hover:text-destructive">
            <LogOut />
            Çıkış yap
          </Button>
        </form>
      </div>
    </div>
  );
}

function Tile({
  item,
  label,
  active,
  onNavigate,
  tone = "bg-accent text-accent-foreground",
  wide,
}: {
  item: NavItem;
  label: string;
  active: boolean;
  tone?: string;
  /** Tam satır: simge solda, metin yanında. */
  wide?: boolean;
  /** Zaten açık olan sayfanın karosunda yol değişmiyor; menü yine kapansın. */
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  return (
    <li className={cn(wide && "col-span-2")}>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        onClick={onNavigate}
        className={cn(
          "flex h-full gap-3 rounded-2xl border bg-card p-4 transition-colors active:bg-muted",
          wide ? "items-center" : "min-h-28 flex-col justify-between",
          active && "border-primary ring-1 ring-primary",
        )}
      >
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", tone)}>
          <Icon className="size-5" />
        </span>
        <span>
          <span className="block text-sm font-semibold">{label}</span>
          {item.description && (
            <span className="block text-xs text-muted-foreground">{item.description}</span>
          )}
        </span>
      </Link>
    </li>
  );
}
