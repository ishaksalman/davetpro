import { whatsAppLink } from "@/lib/format";

/**
 * İşletmenin iletişim bilgileri.
 *
 * Tek yerde: numara hem tanıtım sayfasındaki WhatsApp düğmesinde, hem
 * altbilgide, hem de abonelik sayfasındaki uzatma talebinde kullanılıyor.
 * Üç yere ayrı yazılsaydı biri güncellenmeyip ulaşılamayan bir numara
 * kalırdı.
 */
export const CONTACT_WHATSAPP = "0538 927 57 28";
export const CONTACT_EMAIL = "info@davetpro.com";

/** Hazır metinle WhatsApp bağlantısı. */
export function contactWhatsAppLink(message: string): string | null {
  return whatsAppLink(CONTACT_WHATSAPP, message);
}
