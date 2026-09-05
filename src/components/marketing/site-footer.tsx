import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { Logo } from "@/components/brand/logo";

const COLUMNS = [
  {
    title: "Ürün",
    links: [
      { label: "Özellikler", href: "#ozellikler" },
      { label: "Nasıl çalışır", href: "#nasil-calisir" },
      { label: "Fiyatlar", href: "#fiyatlar" },
      { label: "Referanslar", href: "#referanslar" },
    ],
  },
  {
    title: "Kullanım",
    links: [
      { label: "Takvim ve rezervasyon", href: "#nasil-calisir" },
      { label: "Tahsilat takibi", href: "#nasil-calisir" },
      { label: "Gelir–gider", href: "#nasil-calisir" },
      { label: "Raporlar", href: "#nasil-calisir" },
    ],
  },
  {
    title: "Hesap",
    links: [
      { label: "Giriş yap", href: "/giris" },
      { label: "Kayıt ol", href: "/kayit" },
      { label: "Şifremi unuttum", href: "/sifre-sifirla" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-mk-line bg-mk-soft">
      <div className="mx-auto max-w-[1180px] px-5 sm:px-6">
        <div className="grid gap-12 py-16 lg:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))] lg:gap-8">
          {/* Marka + iletişim */}
          <div className="max-w-[22rem]">
            <Logo className="text-mk-ink" />
            <p className="mt-5 text-[0.9375rem] leading-relaxed text-mk-body">
              Düğün salonları ve organizasyon mekanları için rezervasyon,
              tahsilat ve kârlılık yönetimi.
            </p>

            <div className="mt-6 flex flex-col gap-2.5">
              <a
                href="mailto:merhaba@davetpro.com"
                className="inline-flex items-center gap-2.5 text-[0.875rem] text-mk-body transition-colors hover:text-mk-ink"
              >
                <Mail className="size-4 text-mk-muted" />
                merhaba@davetpro.com
              </a>
              <a
                href="tel:+908508400000"
                className="inline-flex items-center gap-2.5 text-[0.875rem] text-mk-body transition-colors hover:text-mk-ink"
              >
                <Phone className="size-4 text-mk-muted" />
                0850 840 00 00
              </a>
            </div>
          </div>

          {/* Bağlantı sütunları */}
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-[0.8125rem] font-semibold tracking-wide text-mk-ink">
                {col.title}
              </p>
              <ul className="mt-4 flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[0.875rem] text-mk-body transition-colors hover:text-mk-ink"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-mk-line py-7">
          {/* Yasal sayfalar (gizlilik, KVKK, kullanım koşulları) henüz yok.
              Var olmayan yola bağlantı vermek ziyaretçiyi proxy üzerinden
              giriş ekranına düşürürdü; sayfalar eklendiğinde buraya gelir. */}
          <p className="text-[0.8125rem] text-mk-muted">
            © {new Date().getFullYear()} DavetPro. Tüm hakları saklıdır.
          </p>
        </div>
      </div>
    </footer>
  );
}
