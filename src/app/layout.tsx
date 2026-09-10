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

const BASLIK = "DavetPro · Düğün Salonu Yönetim Sistemi";
const ACIKLAMA =
  "Düğün salonları ve organizasyon mekanları için rezervasyon, tahsilat ve gelir-gider yönetimi.";

export const metadata: Metadata = {
  // Göreli adresleri mutlak hâle getiriyor. Tanımlı olmadan Open Graph görsel
  // adresi göreli kalıyor ve WhatsApp, Instagram gibi platformlar çözemiyor.
  metadataBase: new URL(env.appUrl),
  title: { default: BASLIK, template: "%s · DavetPro" },
  description: ACIKLAMA,
  applicationName: "DavetPro",
  // Bağlantı çoğunlukla WhatsApp ve Instagram üzerinden paylaşılıyor;
  // önizleme olmadan sadece adres görünüyor.
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "DavetPro",
    title: BASLIK,
    description: ACIKLAMA,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: BASLIK,
    description: ACIKLAMA,
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
