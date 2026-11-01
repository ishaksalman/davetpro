import type { ReactNode } from "react";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

export type LegalSection = { baslik: string; icerik: ReactNode };

/** Yasal metin sayfası (gizlilik, kullanım koşulları): başlık, güncelleme tarihi ve numaralı bölümler. */
export function LegalPage({
  baslik,
  ozet,
  guncelleme,
  bolumler,
}: {
  baslik: string;
  ozet: string;
  guncelleme: string;
  bolumler: LegalSection[];
}) {
  return (
    <div className="mk-scope min-h-svh">
      <SiteHeader />
      <main className="bg-white pt-28 pb-20 lg:pt-36">
        <div className="mx-auto max-w-[44rem] px-5 sm:px-6">
          <p className="text-[0.8125rem] font-semibold tracking-[0.14em] text-mk-muted uppercase">
            Yasal
          </p>
          <h1 className="mk-title mt-4 text-[clamp(2rem,4vw,2.75rem)] text-mk-ink">{baslik}</h1>
          <p className="mt-4 text-[1.0625rem] leading-relaxed text-mk-body">{ozet}</p>
          <p className="mt-3 text-[0.8125rem] text-mk-muted">Son güncelleme: {guncelleme}</p>

          <div className="mt-12 space-y-10">
            {bolumler.map((b, i) => (
              <section key={b.baslik}>
                <h2 className="text-[1.25rem] font-semibold tracking-tight text-mk-ink">
                  {i + 1}. {b.baslik}
                </h2>
                <div className="mt-3 space-y-3 text-[0.9375rem] leading-relaxed text-mk-body [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
                  {b.icerik}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
