import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { yayindakiYazilar } from "@/lib/blog";

/**
 * Dizine girecek tanıtım yolları. Yeni sayfa eklenince buraya da yazılmalı;
 * tests/robots.test.mts eksik kalanı yakalıyor.
 *
 * NEDEN ELLE TARİH: önceden her sayfanın lastModified'i derleme anıydı. Her
 * dağıtımda tüm sayfalar "değişti" görünüyordu; Google bu yüzden alanı
 * güvenilmez sayıp tamamen yok sayıyor. Tarih, sayfanın içeriği gerçekten
 * değiştiğinde güncellenmeli.
 */
const YOLLAR: { yol: string; oncelik: number; guncellendi: string }[] = [
  { yol: "", oncelik: 1, guncellendi: "2026-11-01" },
  { yol: "/fiyatlar", oncelik: 0.8, guncellendi: "2026-11-01" },
  { yol: "/organizasyon-programi", oncelik: 0.9, guncellendi: "2026-11-01" },
  { yol: "/fotografci-programi", oncelik: 0.9, guncellendi: "2026-11-01" },
  { yol: "/dugun-salonu-sozlesme-ornegi", oncelik: 0.8, guncellendi: "2026-11-01" },
  { yol: "/fotografci-sozlesme-ornegi", oncelik: 0.7, guncellendi: "2026-11-01" },
  { yol: "/blog", oncelik: 0.7, guncellendi: "2026-11-01" },
  { yol: "/gizlilik", oncelik: 0.3, guncellendi: "2026-11-01" },
  { yol: "/kullanim-kosullari", oncelik: 0.3, guncellendi: "2026-11-01" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const sabitler = YOLLAR.map(({ yol, oncelik, guncellendi }) => ({
    url: `${env.appUrl}${yol}`,
    lastModified: new Date(guncellendi),
    changeFrequency: "monthly" as const,
    priority: oncelik,
  }));

  // Yazılar kayıttan geliyor; her yazıda buraya el atmak gerekmiyor.
  const yazilar = yayindakiYazilar().map((y) => ({
    url: `${env.appUrl}/blog/${y.slug}`,
    lastModified: new Date(y.guncellendi ?? y.tarih),
    changeFrequency: "yearly" as const,
    priority: 0.6,
    images: [`${env.appUrl}/blog/${y.slug}/opengraph-image`],
  }));

  return [...sabitler, ...yazilar];
}
