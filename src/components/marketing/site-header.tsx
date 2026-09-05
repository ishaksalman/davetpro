"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Özellikler", href: "#ozellikler" },
  { label: "Nasıl çalışır", href: "#nasil-calisir" },
  { label: "Fiyatlar", href: "#fiyatlar" },
  { label: "Referanslar", href: "#referanslar" },
];

/**
 * Yüzen hap başlık.
 *
 * Referans tasarımdaki kurgu: sayfanın en üstünde ince bir marka degradesi
 * şeridi, altında kenarlardan kopmuş yuvarlak bir konteyner. Konteyner
 * `sticky` olduğu için akışta kalır — `fixed` olsaydı hero'ya ayrıca üst
 * boşluk vermek gerekirdi.
 */
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Mobil menü açıkken arka plan kaymasın.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    // fixed: başlık akıştan çıkar, hero sayfanın en tepesinden başlar ve
    // zemini (kareli desen, kılavuz çizgileri) başlığın altından geçer.
    // Hero'nun üst boşluğu bu yüksekliği telafi eder.
    <header className="fixed inset-x-0 top-0 z-50">
      {/* Marka degradesi şeridi — sayfanın tepesinde sabit kalır. */}
      <div
        aria-hidden
        className="h-[3px] w-full bg-[linear-gradient(90deg,#16e0b4,#0fbfd8,#1a5cff,#6e56f8)]"
      />

      <div className="px-4 pt-3 sm:px-6">
        <div
          className={cn(
            "mx-auto flex max-w-[1180px] items-center gap-6 rounded-[26px] border px-4 py-3 transition-all duration-300 sm:px-5",
            scrolled
              ? "mk-nav-halo-scrolled mk-nav-pill-scrolled border-white/12 backdrop-blur-xl"
              // Hero ile aynı lacivert olduğu için üstte hafifçe açılan bir
              // degrade veriliyor; yoksa hap zeminde tamamen kayboluyor.
              : "mk-nav-halo mk-nav-pill border-white/10 backdrop-blur-xl",
          )}
        >
          <Link href="/" className="flex shrink-0" aria-label="DavetPro ana sayfa">
            <Logo className="text-white" />
          </Link>

          {/* Logoyu menüden ayıran ince çizgi. */}
          <span aria-hidden className="hidden h-6 w-px bg-white/15 lg:block" />

          <nav className="hidden flex-1 items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full px-3.5 py-2 text-[0.9375rem] font-medium text-white/65 transition-colors hover:bg-white/8 hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Link
              href="/giris"
              className="hidden rounded-full px-4 py-2 text-[0.9375rem] font-medium text-white/65 transition-colors hover:text-white sm:block"
            >
              Giriş yap
            </Link>
            <PillLink href="/kayit" className="hidden sm:inline-flex">
              Ücretsiz başlayın
            </PillLink>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Menüyü kapat" : "Menüyü aç"}
              aria-expanded={open}
              className="grid size-10 place-items-center rounded-full border border-white/15 bg-white/8 text-white lg:hidden"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {/* Mobil menü — başlığın altına ayrı bir kart olarak açılır. */}
        {open && (
          <div className="mx-auto mt-2 max-w-[1180px] rounded-[26px] border border-white/12 bg-[#0b1220]/95 p-3 shadow-[0_18px_44px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl lg:hidden">
            <nav className="flex flex-col gap-1">
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-2xl px-4 py-3 text-base font-medium text-white/70 hover:bg-white/8 hover:text-white"
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="mt-3 flex flex-col gap-2 border-t border-white/12 pt-3">
              <Link
                href="/giris"
                onClick={() => setOpen(false)}
                className="rounded-full border border-white/15 px-5 py-3 text-center text-base font-medium text-white"
              >
                Giriş yap
              </Link>
              <PillLink href="/kayit" className="justify-center">
                Ücretsiz başlayın
              </PillLink>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

/**
 * Birincil eylem butonu.
 *
 * Koyu dolgu + dönen degrade çerçeve + sağda daire içinde ok. Çerçevenin
 * animasyonu `.mk-btn-shimmer` içinde (bkz. globals.css); `@property` ile
 * kaydedilmiş açı değişkenleri gerektirdiği için yardımcı sınıfla yazılamaz.
 */
export function PillLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "mk-btn-shimmer group inline-flex items-center gap-2.5 rounded-full py-1.5 pr-1.5 pl-5 text-[0.9375rem] font-semibold transition-transform duration-200 hover:-translate-y-0.5",
        className,
      )}
    >
      {children}
      <span
        aria-hidden
        className="grid size-8 shrink-0 place-items-center rounded-full bg-white/12 text-white transition-transform duration-300 group-hover:rotate-45"
      >
        <ArrowRight className="size-4" />
      </span>
    </Link>
  );
}
