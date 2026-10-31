import type { MetadataRoute } from "next";

/**
 * Ana ekrana eklendiğinde görünen ad ve simge. Personel paneli telefondan
 * kullanıyor; manifest yokken Android "davetpro.com" yazan boş bir kısayol
 * oluşturuyordu.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DavetPro · Düğün Salonu ve Organizasyon Programı",
    short_name: "DavetPro",
    description:
      "Düğün salonları, organizasyon firmaları ve fotoğrafçılar için rezervasyon, kapora ve gelir-gider takibi.",
    lang: "tr",
    start_url: "/panel",
    display: "standalone",
    background_color: "#0B1220",
    theme_color: "#0B1220",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
