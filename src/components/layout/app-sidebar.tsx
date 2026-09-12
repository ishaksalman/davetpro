"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { BrandIcon } from "@/components/brand/logo";
import { ShieldCheck } from "lucide-react";
import { NAV_GROUPS } from "./nav-items";
import { UserMenu } from "./user-menu";
import type { SubscriptionInfo } from "@/lib/subscription";
import type { Business, Profile } from "@/lib/database.types";

export function AppSidebar({
  profile,
  business,
  email,
  showFinance,
  isPlatformAdmin,
  subscription,
  canManageBilling,
}: {
  profile: Profile;
  business: Business;
  email: string;
  showFinance: boolean;
  subscription: SubscriptionInfo | null;
  canManageBilling: boolean;
  /** Uygulamayı işleten taraf — kiracı rolleriyle ilgisi yok. */
  isPlatformAdmin: boolean;
}) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  // Mobilde kenar çubuğu içeriğin üstünü kaplıyor; gezinince kapanmazsa
  // kullanıcı gittiği sayfayı göremiyor.
  //
  // Bağlantıların onClick'ine bağlanmıyoruz: Next Link kendi tıklama
  // mantığını sarmaladığı için handler'ın çalışacağı garanti değil.
  // Rotayı dinlemek her gezinme yolunu kapsıyor — bağlantı, programatik
  // yönlendirme, geri tuşu.
  useEffect(() => {
    setOpenMobile(false);
  }, [pathname, setOpenMobile]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="h-16 justify-center border-b px-4">
        <Link href="/panel" className="flex items-center gap-2.5">
          <BrandIcon className="h-8 w-8" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold leading-tight">
              {business.name}
            </span>
            <span className="block text-xs text-muted-foreground">DavetPro</span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2">
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((i) => showFinance || !i.financeOnly);
          if (items.length === 0) return null;

          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive(item.href)}>
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}

        {/*
          Kiracıya ait bir menü değil: uygulamayı işleten tarafın abonelik
          ekranı. Yetki sunucuda da denetleniyor, buradaki gizleme yalnızca
          görünürlük içindir.
        */}
        {isPlatformAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/yonetim")}>
                    <Link href="/yonetim">
                      <ShieldCheck />
                      <span>Abonelikler</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t p-2">
        <UserMenu
          profile={profile}
          email={email}
          subscription={subscription}
          canManageBilling={canManageBilling}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
