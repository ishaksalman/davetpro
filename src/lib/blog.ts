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
  {
    slug: "dugun-salonu-sozlesmesi",
    baslik: "Düğün salonu sözleşmesinde olması gereken 10 madde (kapora ve iptal dahil)",
    ozet:
      "Taraflardan mücbir sebebe on başlık, \"kapora iade edilmez\" maddesinin neden yetmediği, kademeli iptal tablosu ve sık yapılan beş hata. Kontrol listesiyle.",
    tarih: "2026-09-30",
    guncellendi: "2026-11-14",
    kitle: "salon",
    icerik: () => import("@/content/blog/dugun-salonu-sozlesmesi.mdx"),
  },
  {
    slug: "kapora-ne-kadar-alinmali",
    baslik: "Kapora nasıl yazılır? Makbuz örneği ve ne kadar alınmalı",
    ozet:
      "Kapora makbuzunda olması gereken sekiz alan ve doldurulmuş örnek metin, yaygın kapora oranı, sözleşmedeki iade maddesi ve kalan ödemenin tarihi.",
    tarih: "2026-10-01",
    guncellendi: "2026-11-14",
    kitle: "salon",
    icerik: () => import("@/content/blog/kapora-ne-kadar-alinmali.mdx"),
  },
  {
    slug: "fotografci-sozlesmesi-telif",
    baslik: "Fotoğrafçı sözleşmesinde telif ve kullanım hakkı",
    ozet:
      "Eser sahipliği ile kullanım hakkı aynı şey değil. Müşteri ne yapabilir, fotoğrafçı portfolyosunda kullanabilir mi, ham dosya verilecek mi — hepsi sözleşmede netleşmeli.",
    tarih: "2026-10-02",
    kitle: "fotografci",
    icerik: () => import("@/content/blog/fotografci-sozlesmesi-telif.mdx"),
  },
  {
    slug: "organizasyon-fiyat-teklifi",
    baslik: "Organizasyon fiyat teklifinde neler olmalı?",
    ozet:
      "WhatsApp'tan atılan rakam teklif değildir. Numara, geçerlilik süresi, kapsam dökümü ve gönderdikten sonraki takip — teklifi kazandıran yedi başlık.",
    tarih: "2026-10-03",
    kitle: "salon",
    icerik: () => import("@/content/blog/organizasyon-fiyat-teklifi.mdx"),
  },
  {
    slug: "dugun-salonu-karlilik-hesabi",
    baslik: "Düğün salonunda kârlılık nasıl hesaplanır?",
    ozet:
      "Ciro, tahsilat ve kâr üç ayrı rakamdır. Satışın organizasyon tarihine, paranın işlem tarihine yazılması gerektiğini ve en büyük işin neden en kârlı olmadığını anlatıyoruz.",
    tarih: "2026-10-06",
    kitle: "salon",
    icerik: () => import("@/content/blog/dugun-salonu-karlilik-hesabi.mdx"),
  },
  {
    slug: "excel-ile-dugun-salonu-takibi",
    baslik: "Excel ile düğün salonu takibi nerede tıkanır?",
    ozet:
      "Excel kötü bir araç değil ve çoğu işletmede yeterli. Ama altı belirli noktada tıkanıyor. Hangisi sizde varsa sorun sizde değil, aracın sınırında.",
    tarih: "2026-10-08",
    kitle: "ikisi",
    icerik: () => import("@/content/blog/excel-ile-dugun-salonu-takibi.mdx"),
  },
  {
    slug: "dugun-salonu-programi-secimi",
    baslik: "Düğün salonu programı nasıl seçilir? Sorulacak 10 soru",
    ozet:
      "Masaüstü, Excel ve bulut programların karşılaştırması; çakışma engeli, silinemeyen tahsilat, opsiyonlu tarih ve organizasyon bazlı kâr. Demo kontrol listesi ve bir haftalık geçiş planıyla.",
    tarih: "2026-11-01",
    guncellendi: "2026-11-07",
    kitle: "salon",
    icerik: () => import("@/content/blog/dugun-salonu-programi-secimi.mdx"),
  },
  {
    slug: "dugun-salonu-fiyati-nasil-belirlenir",
    baslik: "Düğün salonu fiyatı nasıl belirlenir?",
    ozet:
      "Maliyet tabanı, kişi başı ve paket fiyat, yoğun ve düşük tarih farkı, indirim sınırı. Fiyatı geçen sezonun biraz üstü diye değil, hesapla kurmanın yolu.",
    tarih: "2026-11-01",
    kitle: "salon",
    icerik: () => import("@/content/blog/dugun-salonu-fiyati-nasil-belirlenir.mdx"),
  },
  {
    slug: "fotografci-teslim-takibi",
    baslik: "Fotoğrafçılar için teslim takibi: albüm neden gecikir?",
    ozet:
      "Gecikme çekimde değil, çekimden sonra başlar. Seçim, düzenleme ve baskı aşamaları, hedef tarih, teslim bağlantısı ve kalan ödeme için kısa bir kontrol listesi.",
    tarih: "2026-11-01",
    kitle: "fotografci",
    icerik: () => import("@/content/blog/fotografci-teslim-takibi.mdx"),
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

/**
 * Yazı sonundaki ürün bağlantısı — kitlenin kendi sayfasına. Fotoğrafçı
 * yazısını okuyan kişiyi salon anasayfasına göndermek onu kaybettiriyordu.
 */
export const KITLE_URUN: Record<
  Yazi["kitle"],
  { baslik: string; metin: string; href: string; bag: string }
> = {
  salon: {
    baslik: "Rezervasyon, kapora ve sözleşme tek panelde",
    metin: "DavetPro düğün salonları ve organizasyon firmaları için.",
    href: "/",
    bag: "Düğün salonu programını inceleyin",
  },
  fotografci: {
    baslik: "Çekimden albüm teslimine tek panelde",
    metin: "DavetPro fotoğrafçılar ve stüdyolar için.",
    href: "/fotografci-programi",
    bag: "Fotoğrafçı programını inceleyin",
  },
  ikisi: {
    baslik: "Defteri ve Excel'i bırakın",
    metin: "DavetPro salonlar, organizasyon firmaları ve fotoğrafçılar için.",
    href: "/",
    bag: "DavetPro'yu inceleyin",
  },
};

/**
 * Yazı sonundaki "ilgili yazılar": önce aynı kitle, sonra genel yazılar,
 * en son diğerleri. Yazılar arası bağlantı, yeni yazının dizine girmesini
 * ve eskilerin güç kazanmasını hızlandırıyor.
 */
export function ilgiliYazilar(slug: string, adet: number): Yazi[] {
  const yazi = YAZILAR.find((y) => y.slug === slug);
  if (!yazi) return [];
  const puan = (y: Yazi) =>
    y.kitle === yazi.kitle ? 0 : y.kitle === "ikisi" || yazi.kitle === "ikisi" ? 1 : 2;
  return yayindakiYazilar()
    .filter((y) => y.slug !== slug)
    .sort((a, b) => puan(a) - puan(b))
    .slice(0, adet);
}
