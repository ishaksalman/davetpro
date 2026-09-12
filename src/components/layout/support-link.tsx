import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
import { supportWhatsAppLink } from "@/lib/support";

/**
 * Kenar çubuğunun altında duran destek bağlantısı.
 *
 * Yüzen düğme değil: mobilde tabloların ve sayfa eylemlerinin önüne geçiyordu.
 * Burada her ekranda görünür ama hiçbir şeyin üstünü kapatmıyor.
 */
export function SupportLink({
  businessName,
  email,
}: {
  businessName: string;
  email: string | null;
}) {
  const href = supportWhatsAppLink({ businessName, email });
  if (!href) return null;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          className="text-[#1da851] hover:bg-[#25D366]/10 hover:text-[#1da851]"
        >
          <a href={href} target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon />
            <span>WhatsApp destek</span>
          </a>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
