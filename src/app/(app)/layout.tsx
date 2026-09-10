import type { Metadata } from "next";
import { requireSession, canSeeFinance } from "@/lib/auth";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";

/**
 * Uygulama sayfaları dizine girmesin. Oturum gerektirdikleri için tarayıcı
 * zaten giriş ekranını görüyor; açıkça belirtmek o kopyaların arama
 * sonuçlarına düşmesini engelliyor. robots.txt ile birlikte iki katmanlı.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { user, profile, business } = await requireSession();

  return (
    <SidebarProvider>
      <AppSidebar
        profile={profile}
        business={business}
        email={user.email ?? ""}
        showFinance={canSeeFinance(profile)}
      />
      <SidebarInset className="min-w-0">{children}</SidebarInset>
    </SidebarProvider>
  );
}
