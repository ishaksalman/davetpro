import type { Metadata, Viewport } from "next";
import { requireSession, canSeeFinance, isAdmin } from "@/lib/auth";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { SubscriptionNotice } from "@/components/layout/subscription-notice";
import { VerticalProvider } from "@/components/layout/vertical-provider";
import { vertical } from "@/lib/vertical";
import { ReservationSuccessProvider } from "./rezervasyonlar/reservation-success-dialog";

/**
 * Uygulama sayfaları dizine girmesin. Oturum gerektirdikleri için tarayıcı
 * zaten giriş ekranını görüyor; açıkça belirtmek o kopyaların arama
 * sonuçlarına düşmesini engelliyor. robots.txt ile birlikte iki katmanlı.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Alt gezinme çubuğu iPhone'un ana ekran çizgisinin altına taşmasın diye
// güvenli alan değerleri (env(safe-area-inset-bottom)) etkin olmalı.
export const viewport: Viewport = { viewportFit: "cover" };

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { user, profile, business, subscription, isPlatformAdmin } =
    await requireSession();

  /*
   * Şerit deneme süresi BOYUNCA görünüyor; ödeme yapmış abonede yalnızca
   * bitime az kaldığında. Deneme kullanıcısı ürünü değerlendiriyor, ne kadar
   * vakti kaldığını her ekranda bilmesi gerekiyor.
   *
   * Platform yöneticisine gösterilmiyor: onun erişimi zaten kilitlenmiyor.
   */
  const uyari =
    subscription &&
    !isPlatformAdmin &&
    (subscription.state === "deneme" || subscription.isWarning)
      ? subscription
      : null;

  const sozluk = vertical(business.business_type);

  return (
    <VerticalProvider value={sozluk}>
      <SidebarProvider>
        <AppSidebar
          profile={profile}
          business={business}
          email={user.email ?? ""}
          showFinance={canSeeFinance(profile)}
          isPlatformAdmin={isPlatformAdmin}
          subscription={subscription}
          canManageBilling={isAdmin(profile)}
        />
        {/* Mobilde alttaki gezinme çubuğu kadar boşluk: son satır altında
            kalmasın. */}
        <SidebarInset className="min-w-0 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
          {uyari && <SubscriptionNotice subscription={uyari} />}
          <ReservationSuccessProvider showFinance={canSeeFinance(profile)}>
            {children}
          </ReservationSuccessProvider>
        </SidebarInset>
        <BottomNav />
      </SidebarProvider>
    </VerticalProvider>
  );
}
