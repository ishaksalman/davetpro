import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

/**
 * Dizine girmesi istenen tek sayfa tanıtım sayfası. Uygulamanın geri kalanı
 * oturum arkasında; oraya bağlantı vermek arama motoruna giriş ekranını
 * göstermekten başka işe yaramaz.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: env.appUrl,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
