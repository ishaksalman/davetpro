"use client";

import { CalendarClock, ChevronsUpDown, KeyRound, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { USER_ROLE_LABELS } from "@/lib/constants";
import { initials } from "@/lib/format";
import type { SubscriptionInfo } from "@/lib/subscription";
import type { Profile } from "@/lib/database.types";
import { logoutAction } from "@/app/(auth)/actions";
import { ChangePasswordDialog } from "./change-password-dialog";

/**
 * Kalan süre bu eşiğin altındaysa menüde gün sayısı da yazılıyor.
 * Üstünde yazmıyoruz: yıllık abonelikte "3650 gün" bilgi değil gürültü.
 */
const GUN_GOSTERME_ESIGI = 60;

export function UserMenu({
  profile,
  email,
  subscription,
  canManageBilling,
}: {
  profile: Profile;
  email: string;
  /** Okunamadıysa null — menüde abonelik satırı gösterilmez. */
  subscription: SubscriptionInfo | null;
  /**
   * Abonelik yöneticinin işi; personel için hem ilgisiz hem yanıltıcı. Süre
   * dolduğunda zaten herkes abonelik sayfasına yönlendiriliyor.
   *
   * Yetki sunucuda hesaplanıp geçiliyor (showFinance ile aynı desen): isAdmin()
   * auth.ts içinde ve o modül sunucuya bağlı.
   */
  canManageBilling: boolean;
}) {
  const abonelikGoster = subscription && canManageBilling;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg bg-primary/10 text-xs font-medium text-primary">
                  {initials(profile.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{profile.full_name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {USER_ROLE_LABELS[profile.role]}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" side="top" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">{profile.full_name}</p>
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/ayarlar">
                <Settings />
                Ayarlar
              </Link>
            </DropdownMenuItem>
            {abonelikGoster && (
              <DropdownMenuItem asChild>
                <Link href="/abonelik">
                  <CalendarClock />
                  Abonelik
                  {subscription.daysLeft <= GUN_GOSTERME_ESIGI && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {subscription.daysLeft === 0
                        ? "bugün"
                        : `${subscription.daysLeft} gün`}
                    </span>
                  )}
                </Link>
              </DropdownMenuItem>
            )}
            {/* onSelect engellenmezse menü kapanırken pencere de kapanıyor. */}
            <ChangePasswordDialog
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <KeyRound />
                  Şifre değiştir
                </DropdownMenuItem>
              }
            />
            <DropdownMenuSeparator />
            <form action={logoutAction}>
              <DropdownMenuItem asChild variant="destructive">
                <button type="submit" className="w-full">
                  <LogOut />
                  Çıkış yap
                </button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
