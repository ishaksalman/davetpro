import type { Metadata } from "next";
import { env } from "@/lib/env";
import { CONTACT_EMAIL, CONTACT_WHATSAPP } from "@/lib/contact";
import { BILLING_TERMS, PLAN_FEATURES, TRIAL_DAYS } from "@/lib/subscription";

/**
 * Tanıtım sayfalarının arama motoru ve paylaşım bilgileri tek yerde.
 *
 * NEDEN YARDIMCI: Next metadata nesnelerini SIĞ birleştiriyor. Bir sayfa
 * `openGraph: { title }` verdiğinde kökteki `openGraph` (görsel, site adı,
 * dil) tamamen siliniyordu; /fiyatlar ve blog yazıları WhatsApp'ta görselsiz
 * paylaşılıyor, Twitter başlığı da anasayfanınki kalıyordu. Her sayfa bu
 * yardımcıdan geçince eksik alan kalmıyor.
 */

export const SITE_NAME = "DavetPro";

/** Kök paylaşım görseli (app/opengraph-image.tsx). */
const VARSAYILAN_GORSEL = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "DavetPro · Düğün salonu, organizasyon ve fotoğrafçı programı",
};

type SayfaBilgisi = {
  /** <title> — şablon " · DavetPro" ekler. `mutlakBaslik` verilirse o kullanılır. */
  baslik: string;
  /** Şablonsuz tam başlık (anasayfa gibi). */
  mutlakBaslik?: string;
  aciklama: string;
  /** "/" ile başlayan yol. */
  yol: string;
  /** Paylaşım kartı başlığı; verilmezse başlıktan türetilir. */
  paylasimBasligi?: string;
  tur?: "website" | "article";
  yayin?: string;
  guncelleme?: string;
  /** Sayfaya özel paylaşım görseli (ör. blog yazısının kendi görseli). */
  gorsel?: { url: string; width: number; height: number; alt: string };
};

export function sayfaMetadata(s: SayfaBilgisi): Metadata {
  const paylasim = s.paylasimBasligi ?? s.mutlakBaslik ?? `${s.baslik} · ${SITE_NAME}`;
  const gorsel = s.gorsel ?? VARSAYILAN_GORSEL;
  return {
    title: s.mutlakBaslik ? { absolute: s.mutlakBaslik } : s.baslik,
    description: s.aciklama,
    alternates: { canonical: s.yol },
    openGraph: {
      type: s.tur ?? "website",
      locale: "tr_TR",
      siteName: SITE_NAME,
      url: s.yol,
      title: paylasim,
      description: s.aciklama,
      images: [gorsel],
      ...(s.tur === "article"
        ? { publishedTime: s.yayin, modifiedTime: s.guncelleme ?? s.yayin }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: paylasim,
      description: s.aciklama,
      images: [gorsel.url],
    },
  };
}

/* ------------------------------------------------------------------------- */
/* Yapısal veri (schema.org JSON-LD)                                          */
/* ------------------------------------------------------------------------- */

export const mutlak = (yol: string) => `${env.appUrl}${yol === "/" ? "" : yol}`;

const ORG_ID = () => `${env.appUrl}/#organization`;
const SITE_ID = () => `${env.appUrl}/#website`;
const UYGULAMA_ID = () => `${env.appUrl}/#software`;

/**
 * Yayıncı her blokta AÇIK yazılıyor: veriler ayrı <script> bloklarında ve
 * Google bloklar arası @id başvurusunu her zaman çözmüyor.
 */
const yayinci = () => ({
  "@type": "Organization",
  "@id": ORG_ID(),
  name: SITE_NAME,
  url: mutlak("/"),
  logo: { "@type": "ImageObject", url: mutlak("/icon-512.png"), width: 512, height: 512 },
});

/** Kuruluş + web sitesi: arama sonucundaki marka adı ve logo için. */
export function kurulusVerisi() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": ORG_ID(),
      name: SITE_NAME,
      url: mutlak("/"),
      logo: { "@type": "ImageObject", url: mutlak("/icon-512.png"), width: 512, height: 512 },
      email: CONTACT_EMAIL,
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        telephone: `+90${CONTACT_WHATSAPP.replace(/\D/g, "").replace(/^0/, "")}`,
        email: CONTACT_EMAIL,
        areaServed: "TR",
        availableLanguage: "Turkish",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": SITE_ID(),
      name: SITE_NAME,
      url: mutlak("/"),
      inLanguage: "tr-TR",
      publisher: yayinci(),
    },
  ];
}

/**
 * Yazılım ürünü + fiyat teklifleri. Fiyatlar BILLING_TERMS'ten geliyor; elle
 * yazılsaydı fiyat değişince arama sonucundaki rakam eski kalırdı.
 */
export function yazilimVerisi() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": UYGULAMA_ID(),
    name: SITE_NAME,
    url: mutlak("/"),
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Düğün salonu ve organizasyon yönetim programı",
    operatingSystem: "Web, iOS, Android (tarayıcı üzerinden)",
    inLanguage: "tr-TR",
    description:
      "Düğün salonları, organizasyon firmaları ve fotoğrafçılar için rezervasyon takvimi, kapora ve tahsilat takibi, teklif ve sözleşme, gelir-gider ve kârlılık raporları.",
    featureList: PLAN_FEATURES.join(", "),
    publisher: yayinci(),
    offers: BILLING_TERMS.map((t) => ({
      "@type": "Offer",
      name: `${t.label} abonelik`,
      price: t.price.toFixed(2),
      priceCurrency: "TRY",
      url: mutlak("/fiyatlar"),
      availability: "https://schema.org/InStock",
      description: `${t.months} aylık kullanım; ${TRIAL_DAYS} gün ücretsiz deneme.`,
    })),
  };
}

export type Soru = { soru: string; cevap: string };

/** Sık sorulanlar — yalnızca sayfada GÖRÜNEN sorular için kullanılmalı. */
export function sssVerisi(sorular: Soru[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: sorular.map((s) => ({
      "@type": "Question",
      name: s.soru,
      acceptedAnswer: { "@type": "Answer", text: s.cevap },
    })),
  };
}

/** Sayfa yolu: arama sonucunda adres yerine "DavetPro › Rehber › …" görünür. */
export function yolVerisi(adimlar: { ad: string; yol: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: adimlar.map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: a.ad,
      item: mutlak(a.yol),
    })),
  };
}

export function yaziVerisi(y: {
  baslik: string;
  ozet: string;
  slug: string;
  tarih: string;
  guncellendi?: string;
}) {
  const adres = mutlak(`/blog/${y.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: y.baslik,
    description: y.ozet,
    datePublished: y.tarih,
    dateModified: y.guncellendi ?? y.tarih,
    inLanguage: "tr-TR",
    mainEntityOfPage: { "@type": "WebPage", "@id": adres },
    url: adres,
    image: `${adres}/opengraph-image`,
    author: yayinci(),
    publisher: yayinci(),
  };
}
