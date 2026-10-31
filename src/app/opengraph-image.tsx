import { ImageResponse } from "next/og";
import { ogFontlari } from "@/lib/og-font";

/**
 * Bağlantı paylaşıldığında görünen önizleme görseli (1200×630).
 *
 * Statik dosya yerine üretiliyor: marka renkleri ve metin tek yerde kalıyor,
 * ayrıca tasarım değişince görseli elle yeniden dışa aktarmak gerekmiyor.
 * Yazı tipi gömülü Manrope (lib/og-font.ts): varsayılan font "ı" içermiyordu.
 */
export const alt = "DavetPro · Düğün salonu, organizasyon ve fotoğrafçı programı";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          background: "#0B1220",
          color: "#ffffff",
          fontFamily: "Manrope",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "linear-gradient(135deg, #1A5CFF, #0FBFD8 55%, #16E0B4)",
            }}
          />
          <span style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.5 }}>
            DavetPro
          </span>
        </div>

        <div
          style={{
            marginTop: 44,
            fontSize: 66,
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: -1.5,
            maxWidth: 900,
            display: "flex",
          }}
        >
          Salonunuzun tüm işi tek bir panelde.
        </div>

        <div
          style={{
            marginTop: 28,
            fontSize: 30,
            color: "#94a3b8",
            maxWidth: 860,
            display: "flex",
          }}
        >
          Rezervasyon, kapora, sözleşme ve kârlılık — salonlar, organizasyon firmaları ve fotoğrafçılar için.
        </div>
      </div>
    ),
    { ...size, fonts: await ogFontlari() },
  );
}
