import { whatsAppLink } from "@/lib/format";

/**
 * Destek ve abonelik taleplerinin geldiği numara.
 *
 * Tek numara, tek yer: abonelik sayfası da buradan okuyor. İki ayrı sabit
 * olsaydı biri güncellenmeyip kullanıcı ulaşamayan bir numaraya yazardı.
 */
export const SUPPORT_WHATSAPP = "0538 927 57 28";

/**
 * Destek için hazır WhatsApp metni.
 *
 * İşletme adı ve hesap mesajın içinde: yazan kişinin kim olduğunu sormadan
 * kayıtlarına bakabilmek gerekiyor.
 */
export function supportWhatsAppLink({
  businessName,
  email,
}: {
  businessName: string;
  email: string | null;
}): string | null {
  const satirlar = [
    "Merhaba, DavetPro kullanıyorum. Yardıma ihtiyacım var.",
    "",
    `İşletme: ${businessName}`,
  ];
  if (email) satirlar.push(`Hesap: ${email}`);
  return whatsAppLink(SUPPORT_WHATSAPP, satirlar.join("\n"));
}
