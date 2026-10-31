import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { env } from "@/lib/env";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

// latin-ext: Türkçe karakterler (ğ, ş, ı, İ, ö, ü, ç) için gerekli.
// Değişken font: 200–800 arası tüm ağırlıklar tek dosyada gelir.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "latin-ext"],
});

/*
 * Başlık arama terimiyle başlıyor: Türkiye'de bu yazılım "program" diye
 * aranıyor ("düğün salonu programı", "salon takip programı"); marka henüz
 * bilinmediği için başa konursa en değerli yer boşa gidiyor.
 */
const BASLIK = "Düğün Salonu Programı · Rezervasyon ve Kapora Takibi | DavetPro";
const ACIKLAMA =
  "Düğün salonları, organizasyon firmaları ve fotoğrafçılar için rezervasyon takvimi, kapora ve tahsilat takibi, sözleşme ve kârlılık raporu. 30 gün ücretsiz.";

export const metadata: Metadata = {
  // Göreli adresleri mutlak hâle getiriyor. Tanımlı olmadan Open Graph görsel
  // adresi göreli kalıyor ve WhatsApp, Instagram gibi platformlar çözemiyor.
  metadataBase: new URL(env.appUrl),
  title: { default: BASLIK, template: "%s · DavetPro" },
  description: ACIKLAMA,
  applicationName: "DavetPro",
  // iOS Safari metindeki telefon numaralarını kendiliğinden tel: bağlantısına
  // çeviriyordu; sunucunun gönderdiği HTML ile tarayıcıdaki ayrışınca React
  // hydration hatası verip ağacı baştan çiziyordu. Gereken yerde bağlantı
  // zaten açıkça (href="tel:…") veriliyor.
  formatDetection: { telephone: false },
  // Arama sonucunda büyük görsel ve uzun özet gösterilebilsin.
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  // Sayfaların çoğu kendi paylaşım bilgisini lib/seo.ts ile veriyor; bu
  // yalnızca vermeyenler (giriş, kayıt) için yedek.
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "DavetPro",
    title: BASLIK,
    description: ACIKLAMA,
  },
  twitter: {
    card: "summary_large_image",
    title: BASLIK,
    description: ACIKLAMA,
  },
  // Google Search Console mülk doğrulaması. Ham <meta> yerine metadata API:
  // Next zaten <head>'i buradan kuruyor, elle eklenen etiket sıralamaya göre
  // ezilebiliyor.
  verification: {
    google: "Rj79muUWatiHusoN6ePijs1kTForPnjmircOtJGg0xY",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      className={`${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Tooltip'ler tüm ağaçta kullanıldığı için sağlayıcı kökte duruyor. */}
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
