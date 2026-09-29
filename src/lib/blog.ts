import type { ComponentType } from "react";

/**
 * Blog yazıları.
 *
 * NEDEN AÇIK KAYIT (dosya taraması değil): `fs` ile içerik klasörünü taramak
 * yerelde çalışıp Vercel'de boş dönebiliyor — dosyalar içe aktarılmadıkları
 * için çıktı izine girmiyorlar. Statik içe aktarma her ortamda aynı davranır
 * ve tip denetiminden geçer.
 *
 * Kaydı güncellemeyi unutma ihtimaline karşı tests/blog.test.mts klasördeki
 * her .mdx dosyasının burada olup olmadığına bakıyor.
 */
export type Yazi = {
  slug: string;
  baslik: string;
  ozet: string;
  /** ISO tarih. Yayın sırası ve <time> için. */
  tarih: string;
  /** Sonradan güncellendiyse. */
  guncellendi?: string;
  /** Hangi kitleye yazıldı — liste sayfasında rozet, iç bağlantıda yön. */
  kitle: "salon" | "fotografci" | "ikisi";
  /** Yayında değilse listede ve sitemap'te görünmez. */
  taslak?: boolean;
};

type Kayit = Yazi & { icerik: () => Promise<{ default: ComponentType }> };

const YAZILAR: Kayit[] = [
  {
    slug: "ayni-gune-iki-dugun-cakisma",
    baslik: "Aynı güne iki düğün: çakışma nasıl önlenir?",
    ozet:
      "Çift rezervasyon defterle de takvimle de olabiliyor. Sorunun neden insan dikkatiyle çözülemediğini ve yazılımın nerede devreye girmesi gerektiğini anlatıyoruz.",
    tarih: "2026-09-29",
    kitle: "salon",
    icerik: () => import("@/content/blog/ayni-gune-iki-dugun-cakisma.mdx"),
  },
];

/** Yayındakiler, yeniden eskiye. */
export function yayindakiYazilar(): Yazi[] {
  return YAZILAR.filter((y) => !y.taslak).sort((a, b) =>
    b.tarih.localeCompare(a.tarih),
  );
}

export function yaziBul(slug: string): Kayit | undefined {
  return YAZILAR.find((y) => y.slug === slug && !y.taslak);
}

/** Test ve sitemap için: taslaklar dahil tüm kayıtlı slug'lar. */
export function tumSluglar(): string[] {
  return YAZILAR.map((y) => y.slug);
}

export const KITLE_ETIKET: Record<Yazi["kitle"], string> = {
  salon: "Düğün salonu",
  fotografci: "Fotoğrafçı",
  ikisi: "Genel",
};
