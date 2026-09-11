import type { Metadata } from "next";
import { requireSession, canSeeFinance, isAdmin } from "@/lib/auth";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SubscriptionNotice } from "@/components/layout/subscription-notice";

/**
 * Uygulama sayfaları dizine girmesin. Oturum gerektirdikleri için tarayıcı
 * zaten giriş ekranını görüyor; açıkça belirtmek o kopyaların arama
 * sonuçlarına düşmesini engelliyor. robots.txt ile birlikte iki katmanlı.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { user, profile, business, subscription, isPlatformAdmin } =
    await requireSession();

  // Platform yöneticisine gösterilmiyor: onun erişimi zaten kilitlenmiyor.
  const uyari =
    subscription?.isWarning && !isPlatformAdmin ? subscription : null;

  return (
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
      <SidebarInset className="min-w-0">
        {uyari && (
          <SubscriptionNotice
            subscription={uyari}
            businessName={business.name}
            email={user.email}
          />
        )}
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
