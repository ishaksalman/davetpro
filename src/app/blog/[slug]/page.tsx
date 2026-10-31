import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { sayfaMetadata, yaziVerisi, yolVerisi } from "@/lib/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PillLink, SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { WhatsAppFloat } from "@/components/marketing/whatsapp-float";
import { ilgiliYazilar, KITLE_ETIKET, KITLE_URUN, tumSluglar, yaziBul } from "@/lib/blog";
import { formatDate } from "@/lib/format";
import { TRIAL_DAYS } from "@/lib/subscription";

export function generateStaticParams() {
  return tumSluglar().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const yazi = yaziBul(slug);
  if (!yazi) return {};

  return sayfaMetadata({
    baslik: yazi.baslik,
    aciklama: yazi.ozet,
    yol: `/blog/${yazi.slug}`,
    paylasimBasligi: yazi.baslik,
    tur: "article",
    yayin: yazi.tarih,
    guncelleme: yazi.guncellendi,
    gorsel: {
      url: `/blog/${yazi.slug}/opengraph-image`,
      width: 1200,
      height: 630,
      alt: yazi.baslik,
    },
  });
}

export default async function BlogYaziPage({
  params,
}: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const yazi = yaziBul(slug);
  if (!yazi) notFound();

  const { default: Icerik } = await yazi.icerik();

  const ilgili = ilgiliYazilar(yazi.slug, 3);
  const urun = KITLE_URUN[yazi.kitle];

  return (
    <div className="mk-scope min-h-svh">
      <SiteHeader />

      {/* BlogPosting: arama sonucunda tarih ve başlık; yol: "DavetPro › Rehber". */}
      <JsonLd
        data={[
          yaziVerisi(yazi),
          yolVerisi([
            { ad: "DavetPro", yol: "/" },
            { ad: "Rehber", yol: "/blog" },
            { ad: yazi.baslik, yol: `/blog/${yazi.slug}` },
          ]),
        ]}
      />

      <main>
        <article className="bg-white pt-28 pb-16 lg:pt-36 lg:pb-20">
          <div className="mx-auto max-w-[44rem] px-5 sm:px-6">
            <nav aria-label="Sayfa yolu" className="text-[0.8125rem] text-mk-muted">
              <ol className="flex flex-wrap items-center gap-1.5">
                <li>
                  <Link href="/" className="hover:text-mk-ink">DavetPro</Link>
                </li>
                <li aria-hidden>›</li>
                <li>
                  <Link href="/blog" className="inline-flex items-center gap-1 hover:text-mk-ink">
                    <ArrowLeft className="size-3.5" />
                    Rehber
                  </Link>
                </li>
              </ol>
            </nav>

            <header className="mt-8">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-mk-soft px-2.5 py-1 text-[0.6875rem] font-medium text-mk-body">
                  {KITLE_ETIKET[yazi.kitle]}
                </span>
                <time dateTime={yazi.tarih} className="text-[0.8125rem] text-mk-muted">
                  {formatDate(yazi.tarih)}
                </time>
                {yazi.guncellendi && (
                  <span className="text-[0.8125rem] text-mk-muted">
                    · Güncellendi{" "}
                    <time dateTime={yazi.guncellendi}>{formatDate(yazi.guncellendi)}</time>
                  </span>
                )}
              </div>
              <h1 className="mk-title mt-4 text-[clamp(1.75rem,3.4vw,2.5rem)] text-mk-ink">
                {yazi.baslik}
              </h1>
              <p className="mt-5 text-[1.125rem] leading-relaxed text-mk-body">
                {yazi.ozet}
              </p>
            </header>

            <div className="mt-12">
              <Icerik />
            </div>

            <aside className="mt-16 rounded-[24px] bg-mk-ink px-8 py-10 text-center">
              <p className="mk-title text-[1.25rem] text-white">{urun.baslik}</p>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-white/70">
                {urun.metin} {TRIAL_DAYS} gün ücretsiz; kart bilgisi istemiyoruz.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
                <PillLink href="/kayit">Hemen başlayın</PillLink>
                <Link
                  href={urun.href}
                  className="text-[0.9375rem] font-medium text-white/80 underline-offset-4 hover:text-white hover:underline"
                >
                  {urun.bag}
                </Link>
              </div>
            </aside>

            {ilgili.length > 0 && (
              <section className="mt-16">
                <h2 className="mk-title text-[1.375rem] text-mk-ink">Bunlar da ilginizi çekebilir</h2>
                <ul className="mt-6 grid grid-cols-1 gap-3">
                  {ilgili.map((y) => (
                    <li key={y.slug}>
                      <Link
                        href={`/blog/${y.slug}`}
                        className="block rounded-[18px] border border-mk-line bg-white p-5 transition-shadow hover:shadow-[0_18px_40px_-30px_rgba(11,18,32,0.4)]"
                      >
                        <p className="text-[1.0625rem] font-semibold tracking-tight text-mk-ink">{y.baslik}</p>
                        <p className="mt-1.5 text-[0.875rem] leading-relaxed text-mk-body">{y.ozet}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </article>
      </main>

      <SiteFooter />
      <WhatsAppFloat />
    </div>
  );
}
