import { requireSession, canSeeFinance } from "@/lib/auth";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";

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
