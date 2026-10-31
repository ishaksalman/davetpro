import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { KORUNAN_YOLLAR, MISAFIR_YOLLARI } from "@/lib/routes";

/**
 * Yalnızca tanıtım sayfaları dizine girsin.
 *
 * Uygulama yolları oturum gerektirdiği için tarayıcıya zaten giriş ekranını
 * gösteriyor; yine de açıkça dışarıda bırakmak, giriş sayfasının kopyalarının
 * arama sonuçlarına düşmesini engelliyor. Liste proxy ile ortak
 * (lib/routes.ts); tests/robots.test.mts dosya sistemindeki yollarla
 * karşılaştırıp eksik kalanı yakalıyor.
 *
 * Not: bu yolun proxy matcher'ından çıkarılması gerekiyor, aksi hâlde
 * oturumsuz istek /giris'e yönlendiriliyor ve robot 307 alıyor.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        ...KORUNAN_YOLLAR,
        ...MISAFIR_YOLLARI,
        "/sifre-yenile",
        // Müşterinin WhatsApp'tan açtığı sözleşme bağlantısı.
        "/s/",
        "/auth/",
        "/api/",
      ],
    },
    sitemap: `${env.appUrl}/sitemap.xml`,
  };
}
