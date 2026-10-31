import Link from "next/link";
import type { Metadata } from "next";
import { PillLink, SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

/**
 * Var olmayan adres. Önceden proxy her bilinmeyen yolu giriş ekranına
 * yönlendiriyordu (yumuşak 404); artık gerçek 404 kodu dönüyor ve ziyaretçi
 * boş bir sayfa yerine sitenin ana yollarını görüyor.
 */
export const metadata: Metadata = {
  title: "Sayfa bulunamadı",
  robots: { index: false, follow: true },
};

const YOLLAR = [
  { href: "/", ad: "Düğün salonu programı" },
  { href: "/organizasyon-programi", ad: "Organizasyon programı" },
  { href: "/fotografci-programi", ad: "Fotoğrafçı programı" },
  { href: "/fiyatlar", ad: "Fiyatlar" },
  { href: "/blog", ad: "Rehber" },
];

export default function NotFound() {
  return (
    <div className="mk-scope min-h-svh">
      <SiteHeader />
      <main className="bg-white pt-36 pb-24">
        <div className="mx-auto max-w-[40rem] px-5 text-center sm:px-6">
          <p className="text-[0.8125rem] font-semibold tracking-[0.14em] text-mk-muted uppercase">404</p>
          <h1 className="mk-title mt-4 text-[clamp(2rem,4vw,2.75rem)] text-mk-ink">
            Aradığınız sayfa burada değil
          </h1>
          <p className="mt-5 text-[1.0625rem] leading-relaxed text-mk-body">
            Bağlantı eskimiş ya da adres yanlış yazılmış olabilir.
          </p>
          <ul className="mt-8 flex flex-wrap justify-center gap-2.5">
            {YOLLAR.map((y) => (
              <li key={y.href}>
                <Link
                  href={y.href}
                  className="inline-flex rounded-full border border-mk-line px-4 py-2 text-[0.875rem] font-medium text-mk-ink hover:bg-mk-soft"
                >
                  {y.ad}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex justify-center">
            <PillLink href="/giris">Panele giriş yapın</PillLink>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
