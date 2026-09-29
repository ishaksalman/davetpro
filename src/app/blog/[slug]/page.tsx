import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PillLink, SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { WhatsAppFloat } from "@/components/marketing/whatsapp-float";
import { KITLE_ETIKET, tumSluglar, yaziBul } from "@/lib/blog";
import { formatDate } from "@/lib/format";
import { TRIAL_DAYS } from "@/lib/subscription";
import { env } from "@/lib/env";

export function generateStaticParams() {
  return tumSluglar().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const yazi = yaziBul(slug);
  if (!yazi) return {};

  return {
    title: yazi.baslik,
    description: yazi.ozet,
    alternates: { canonical: `/blog/${yazi.slug}` },
    openGraph: {
      type: "article",
      title: yazi.baslik,
      description: yazi.ozet,
      url: `/blog/${yazi.slug}`,
      publishedTime: yazi.tarih,
      modifiedTime: yazi.guncellendi ?? yazi.tarih,
    },
  };
}

export default async function BlogYaziPage({
  params,
}: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const yazi = yaziBul(slug);
  if (!yazi) notFound();

  const { default: Icerik } = await yazi.icerik();

  /*
   * Article yapısal verisi. Arama sonucunda tarih ve başlığın doğru
   * görünmesini sağlıyor; yayıncı olarak işletme değil ürün adı veriliyor
   * çünkü yazıların sahibi DavetPro.
   */
  const yapisalVeri = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: yazi.baslik,
    description: yazi.ozet,
    datePublished: yazi.tarih,
    dateModified: yazi.guncellendi ?? yazi.tarih,
    inLanguage: "tr-TR",
    mainEntityOfPage: `${env.appUrl}/blog/${yazi.slug}`,
    publisher: { "@type": "Organization", name: "DavetPro" },
  };

  return (
    <div className="mk-scope min-h-svh">
      <SiteHeader />

      <script
        type="application/ld+json"
        // Veri bizim ürettiğimiz sabit alanlardan geliyor, kullanıcı girdisi yok.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(yapisalVeri) }}
      />

      <main>
        <article className="bg-white pt-28 pb-16 lg:pt-36 lg:pb-20">
          <div className="mx-auto max-w-[44rem] px-5 sm:px-6">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-[0.875rem] text-mk-muted hover:text-mk-ink"
            >
              <ArrowLeft className="size-4" />
              Tüm yazılar
            </Link>

            <header className="mt-8">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-mk-soft px-2.5 py-1 text-[0.6875rem] font-medium text-mk-body">
                  {KITLE_ETIKET[yazi.kitle]}
                </span>
                <time dateTime={yazi.tarih} className="text-[0.8125rem] text-mk-muted">
                  {formatDate(yazi.tarih)}
                </time>
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
              <p className="mk-title text-[1.25rem] text-white">
                DavetPro&apos;yu {TRIAL_DAYS} gün ücretsiz deneyin
              </p>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-white/70">
                Kart bilgisi istemiyoruz.
              </p>
              <div className="mt-6 flex justify-center">
                <PillLink href="/kayit">Hemen başlayın</PillLink>
              </div>
            </aside>
          </div>
        </article>
      </main>

      <SiteFooter />
      <WhatsAppFloat />
    </div>
  );
}
