import { ImageResponse } from "next/og";
import { ogFontlari } from "@/lib/og-font";
import { KITLE_ETIKET, tumSluglar, yaziBul } from "@/lib/blog";

/**
 * Yazıya özel paylaşım görseli: başlık görselin üzerinde. Tüm yazılar
 * anasayfa görseliyle paylaşılınca WhatsApp'ta hepsi aynı görünüyordu;
 * Google Discover ve görsel arama da yazı başına ayrı görsel istiyor.
 * Yazı tipi lib/og-font.ts'de (Türkçe harfler için gömülü Manrope).
 */
export const alt = "DavetPro rehber yazısı";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return tumSluglar().map((slug) => ({ slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const yazi = yaziBul(slug);
  const baslik = yazi?.baslik ?? "DavetPro Rehber";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 88px",
          background: "#0B1220",
          color: "#ffffff",
          fontFamily: "Manrope",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "linear-gradient(135deg, #1A5CFF, #0FBFD8 55%, #16E0B4)",
            }}
          />
          <span style={{ fontSize: 30, fontWeight: 700 }}>DavetPro</span>
          <span style={{ fontSize: 26, color: "#94a3b8", marginLeft: 8 }}>
            · Rehber{yazi ? ` · ${KITLE_ETIKET[yazi.kitle]}` : ""}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: baslik.length > 48 ? 60 : 70,
            fontWeight: 700,
            lineHeight: 1.12,
            letterSpacing: -1.5,
            maxWidth: 1000,
          }}
        >
          {baslik}
        </div>

        <div
          style={{
            display: "flex",
            height: 8,
            width: 260,
            borderRadius: 999,
            background: "linear-gradient(90deg, #1A5CFF, #0FBFD8, #16E0B4)",
          }}
        />
      </div>
    ),
    { ...size, fonts: await ogFontlari() },
  );
}
