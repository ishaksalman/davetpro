import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

// latin-ext: Türkçe karakterler (ğ, ş, ı, İ, ö, ü, ç) için gerekli.
// Değişken font: 200–800 arası tüm ağırlıklar tek dosyada gelir.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: {
    default: "DavetPro · Düğün Salonu Yönetim Sistemi",
    template: "%s · DavetPro",
  },
  description:
    "Düğün salonları ve organizasyon mekanları için rezervasyon, tahsilat ve gelir-gider yönetimi.",
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
