import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

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
];

export default function sitemap(): MetadataRoute.Sitemap {
  const simdi = new Date();
  return YOLLAR.map(({ yol, oncelik }) => ({
    url: `${env.appUrl}${yol}`,
    lastModified: simdi,
    changeFrequency: "monthly" as const,
    priority: oncelik,
  }));
}
