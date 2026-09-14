import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

/**
 * Dizine girmesi istenen tanıtım sayfaları. Uygulamanın geri kalanı oturum
 * arkasında; oraya bağlantı vermek arama motoruna giriş ekranını göstermekten
 * başka işe yaramaz.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: env.appUrl,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${env.appUrl}/fiyatlar`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
