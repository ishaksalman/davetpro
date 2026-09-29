import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { yayindakiYazilar } from "@/lib/blog";

/**
 * Dizine girmesi istenen tanıtım sayfaları. Uygulamanın geri kalanı oturum
 * arkasında; oraya bağlantı vermek arama motoruna giriş ekranını göstermekten
 * başka işe yaramaz.
 */
/**
 * Dizine girecek tanıtım yolları. Yeni sayfa eklenince buraya da yazılmalı;
 * tests/robots.test.mts eksik kalanı yakalıyor.
 */
const YOLLAR: { yol: string; oncelik: number }[] = [
  { yol: "", oncelik: 1 },
  { yol: "/fiyatlar", oncelik: 0.8 },
  { yol: "/fotografci-programi", oncelik: 0.9 },
  { yol: "/blog", oncelik: 0.7 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const simdi = new Date();
  const sabitler = YOLLAR.map(({ yol, oncelik }) => ({
    url: `${env.appUrl}${yol}`,
    lastModified: simdi,
    changeFrequency: "monthly" as const,
    priority: oncelik,
  }));

  // Yazılar kayıttan geliyor; her yazıda buraya el atmak gerekmiyor.
  const yazilar = yayindakiYazilar().map((y) => ({
    url: `${env.appUrl}/blog/${y.slug}`,
    lastModified: new Date(y.guncellendi ?? y.tarih),
    changeFrequency: "yearly" as const,
    priority: 0.6,
  }));

  return [...sabitler, ...yazilar];
}
