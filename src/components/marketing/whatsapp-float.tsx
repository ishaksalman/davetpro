import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
import { contactWhatsAppLink } from "@/lib/contact";

/**
 * Tanıtım sayfasının sağ alt köşesindeki WhatsApp düğmesi.
 *
 * Uygulamanın içinde yüzen düğme kullanmıyoruz — orada tabloların ve eylem
 * düğmelerinin önüne geçiyor. Tanıtım sayfası ise çalışılan bir yüzey değil,
 * okunan bir sayfa; kapattığı bir şey yok.
 *
 * Hazır metin ziyaretçinin kim olduğunu bilmediğimizi varsayıyor: henüz
 * müşteri değil, bilgi almak için yazıyor.
 */
export function WhatsAppFloat() {
  const href = contactWhatsAppLink(
    "Merhaba, DavetPro hakkında bilgi almak istiyorum.",
  );
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp'tan yazın"
      // pb-[env(safe-area-inset-bottom)] yok: sabit konum zaten alt çentiğin
      // üstünde kalıyor, ek boşluk düğmeyi ekranın ortasına itiyordu.
      className="fixed right-5 bottom-5 z-50 inline-flex size-13 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_10px_30px_-8px_rgba(37,211,102,0.6)] transition-transform hover:scale-105 focus-visible:ring-3 focus-visible:ring-[#25D366]/40 focus-visible:outline-none sm:right-7 sm:bottom-7"
    >
      <WhatsAppIcon className="size-7" />
    </a>
  );
}
