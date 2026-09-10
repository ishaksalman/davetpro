import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

/**
 * Yalnızca tanıtım sayfası dizine girsin.
 *
 * Uygulama yolları oturum gerektirdiği için tarayıcıya zaten giriş ekranını
 * gösteriyor; yine de açıkça dışarıda bırakmak, giriş sayfasının kopyalarının
 * arama sonuçlarına düşmesini engelliyor.
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
        "/panel",
        "/takvim",
        "/talepler",
        "/rezervasyonlar",
        "/musteriler",
        "/gelirler",
        "/giderler",
        "/raporlar",
        "/paketler",
        "/salonlar",
        "/ayarlar",
        "/isletme-kur",
        "/giris",
        "/kayit",
        "/sifre-sifirla",
        "/sifre-yenile",
        "/auth/",
        "/api/",
      ],
    },
    sitemap: `${env.appUrl}/sitemap.xml`,
  };
}
