import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { WhatsAppFloat } from "@/components/marketing/whatsapp-float";
import { Reveal } from "@/components/marketing/reveal";
import { EmptyState } from "@/components/shared/empty-state";
import { KITLE_ETIKET, yayindakiYazilar } from "@/lib/blog";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Rehber",
  description:
    "Düğün salonu ve fotoğraf stüdyosu işletmek üzerine rehberler: rezervasyon, kapora, sözleşme, kârlılık ve teslim süreçleri.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Rehber · DavetPro",
    description: "Düğün salonu ve fotoğraf stüdyosu işletmek üzerine rehberler.",
    url: "/blog",
  },
};

export default function BlogPage() {
  const yazilar = yayindakiYazilar();

  return (
    <div className="mk-scope min-h-svh">
      <SiteHeader />

      <main>
        <section className="bg-white pt-28 pb-16 lg:pt-36 lg:pb-20">
          <div className="mx-auto max-w-[1180px] px-5 sm:px-6">
            <Reveal className="mx-auto max-w-[42rem] text-center">
              <p className="text-[0.8125rem] font-semibold tracking-[0.14em] text-mk-muted uppercase">
                Rehber
              </p>
              <h1 className="mk-title mt-4 text-[clamp(2rem,4vw,3rem)] text-mk-ink">
                İşin kendisi üzerine yazılar
              </h1>
              <p className="mt-5 text-[1.0625rem] leading-relaxed text-mk-body">
                Rezervasyon, kapora, sözleşme, kârlılık ve teslim süreçleri.
                Yazılım tanıtımı değil; işin nasıl yürüdüğü.
              </p>
            </Reveal>

            {yazilar.length === 0 ? (
              <div className="mt-14">
                <EmptyState
                  icon={FileText}
                  title="Henüz yazı yok"
                  description="İlk rehber yakında burada olacak."
                />
              </div>
            ) : (
              <ul className="mx-auto mt-14 grid max-w-3xl gap-4">
                {yazilar.map((y, i) => (
                  <Reveal key={y.slug} delay={i * 70}>
                    <li className="rounded-[20px] border border-mk-line bg-white transition-shadow hover:shadow-[0_18px_40px_-28px_rgba(11,18,32,0.4)]">
                      <Link href={`/blog/${y.slug}`} className="block p-7">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="rounded-full bg-mk-soft px-2.5 py-1 text-[0.6875rem] font-medium text-mk-body">
                            {KITLE_ETIKET[y.kitle]}
                          </span>
                          <time
                            dateTime={y.tarih}
                            className="text-[0.8125rem] text-mk-muted"
                          >
                            {formatDate(y.tarih)}
                          </time>
                        </div>
                        <h2 className="mt-3 text-[1.25rem] font-semibold tracking-tight text-mk-ink">
                          {y.baslik}
                        </h2>
                        <p className="mt-2 text-[0.9375rem] leading-relaxed text-mk-body">
                          {y.ozet}
                        </p>
                      </Link>
                    </li>
                  </Reveal>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
      <WhatsAppFloat />
    </div>
  );
}
