/**
 * Oturum gerektiren uygulama yolları — robots.txt ve proxy aynı listeyi
 * kullanıyor.
 *
 * NEDEN AÇIK LİSTE: proxy önceden "açık olmayan her yolu" giriş ekranına
 * yönlendiriyordu. Var olmayan bir adres (eski bir bağlantı, yazım hatası)
 * 404 yerine 307 → /giris dönüyordu; Google bunları "yumuşak 404" sayıyor ve
 * siteye güveni düşüyor. Artık yalnızca bu yollar oturum istiyor, gerisi
 * Next'in 404 sayfasına düşüyor.
 *
 * Listeye eklemeyi unutmak güvenlik açığı DEĞİL: (app) düzeni zaten
 * requireSession ile koruyor. Unutulan yol yalnızca taranmaya açık kalır;
 * tests/robots.test.mts bunu yakalıyor.
 */
export const KORUNAN_YOLLAR = [
  "/panel",
  "/abonelik",
  "/takvim",
  "/talepler",
  "/teslimat",
  "/rezervasyonlar",
  "/musteriler",
  "/gelirler",
  "/giderler",
  "/raporlar",
  "/paketler",
  "/salonlar",
  "/ekipler",
  "/ayarlar",
  "/yonetim",
  "/isletme-kur",
] as const;

/** Oturum açmış kullanıcının işi olmayan sayfalar — panele yönlendirilir. */
export const MISAFIR_YOLLARI = ["/giris", "/kayit", "/sifre-sifirla"] as const;

/** Yol, listedeki bir öneke segment sınırında uyuyor mu ("/panelx" uymaz). */
export function onekUyar(yol: string, onekler: readonly string[]): boolean {
  return onekler.some((o) => yol === o || yol.startsWith(`${o}/`));
}
