import type { BusinessType, OrganizationType } from "@/lib/database.types";

/**
 * İşin cinsine göre değişen sözlük.
 *
 * NEDEN TEK DOSYA: dallanmayı ekranlara yaymak iki ürünü de vasatlaştırır.
 * Ekranlar "salon" yerine buradan gelen etiketi kullanıyor; yeni bir dikey
 * eklemek bu dosyaya bir satır eklemek oluyor.
 *
 * NEDEN ŞEMA DEĞİL SÖZLÜK: kısıtlı kaynak iki işte de aynı şey — salonda
 * salon, fotoğrafçıda ekip. İkisi de aynı `venues` satırı, aynı çakışma
 * kısıtı. Değişen yalnızca kullanıcıya görünen ad.
 */
export type Vertical = {
  /** Kayıt ekranında görünen ad. */
  label: string;
  /** Seçim ekranındaki açıklama. */
  description: string;
  /** Kısıtlı kaynak — tekil ve çoğul. */
  resource: { singular: string; plural: string };
  /** "Yeni salon" / "Yeni ekip" gibi eylem etiketleri. */
  resourceNew: string;
  /** Boş durum başlığı. */
  resourceEmpty: string;
  /** Rezervasyon formunda kaynak alanının etiketi. */
  resourceField: string;
  /**
   * Etkinliğin adı. Salonda "organizasyon", fotoğrafçıda "çekim".
   *
   * NEDEN ÇEKİM TABLOSU: Türkçe ekleri ünlü uyumuna göre değişiyor —
   * "organizasyona" ama "çekime", "organizasyonlardan" ama "çekimlerden".
   * Ek üreten bir yardımcı yazmak iki kelime için fazla; biçimler burada
   * açıkça duruyor, yanlış çekim gözle görülüyor.
   *
   * Küçük harfle tutuluyor; cümle başında `buyukHarf()` ile büyütülüyor
   * ("i" → "İ" olduğu için düz `toUpperCase()` kullanılmıyor).
   */
  event: {
    /** organizasyon */
    singular: string;
    /** organizasyonlar */
    plural: string;
    /** organizasyona — "… bağlı gider" */
    dative: string;
    /** organizasyonun — "o …n kârlılığı" */
    genitive: string;
    /** organizasyonlardan — "bu ayki …" */
    ablativePlural: string;
    /** organizasyonları — "hangi tür …" */
    accusativePlural: string;
    /** organizasyonunuz — müşteriye giden mesajlarda */
    possessive: string;
  };
  /** İşletme adı için örnek metin. */
  businessPlaceholder: string;
  /** Kaynak adı için örnek metin. */
  resourcePlaceholder: string;
  /** Kaynak açıklaması için örnek metin. */
  resourceDescPlaceholder: string;
  /**
   * Misafir sayısı ve kişi başı fiyat gösterilsin mi.
   *
   * Fotoğrafçıda davetli sayısı işi etkilemiyor ve fiyat kişi başına
   * hesaplanmıyor; alanları göstermek doldurulacak boş kutu bırakmak olurdu.
   */
  usesGuestCount: boolean;
  /** Etkinlik adresi alanı gösterilsin mi. */
  usesLocation: boolean;
  /**
   * Formda sunulan iş türleri.
   *
   * Enum'da hepsi var; burada yalnızca o işin gerçekten yaptıkları
   * listeleniyor. Salona "bebek çekimi", fotoğrafçıya "sünnet salonu
   * organizasyonu" göstermek doldurulacak çöp seçenek olurdu.
   */
  eventTypes: OrganizationType[];
  /**
   * Tür alanının etiketi.
   *
   * Stüdyoda "Tür" yeterli; işin adı zaten seçeneklerde ("Vesikalık",
   * "Ürün Çekimi"). Salonda "Organizasyon türü" bilgilendirici kalıyor.
   */
  eventTypeLabel: string;
  /**
   * Ek hizmet bölümünde tek tıkla eklenen öneriler.
   * Tutarlar yalnızca başlangıç değeri; kullanıcı değiştiriyor.
   */
  suggestedExtras: { name: string; amount: number }[];
  /**
   * Paket tanımlarken "dahil olan hizmetler" bölümünde tek tıkla eklenen
   * öneriler. Salonun menü kalemleriyle stüdyonun teslim kalemleri
   * birbirinin yerine geçmiyor.
   */
  packageServices: string[];
  /**
   * Ekip kavramı kullanılıyor mu.
   *
   * Plato ile karıştırılmamalı: plato kısıtlı kaynak (aynı saatte tek çekim),
   * ekip çekime atanan kişiler ve zorunlu değil. Salonda karşılığı yok.
   */
  usesTeams: boolean;
  /**
   * Çekim sonrası teslim akışı kullanılıyor mu.
   * Salonda organizasyon biter iş biter; fotoğrafçıda seçim, düzenleme,
   * baskı ve teslim adımları var.
   */
  usesDelivery: boolean;
};

export const VERTICALS: Record<BusinessType, Vertical> = {
  salon: {
    label: "Düğün salonu",
    description:
      "Kendi mekânınızda düğün, nişan, kına ve kurumsal organizasyon düzenliyorsanız.",
    resource: { singular: "Salon", plural: "Salonlar" },
    resourceNew: "Yeni salon",
    resourceEmpty: "Henüz salon eklenmemiş",
    resourceField: "Salon",
    event: {
      singular: "organizasyon",
      plural: "organizasyonlar",
      dative: "organizasyona",
      genitive: "organizasyonun",
      ablativePlural: "organizasyonlardan",
      accusativePlural: "organizasyonları",
      possessive: "organizasyonunuz",
    },
    businessPlaceholder: "Gül Düğün Salonu",
    resourcePlaceholder: "Balo Salonu",
    resourceDescPlaceholder: "Kapalı, klimalı, 500 kişilik balo salonu",
    usesGuestCount: true,
    eventTypes: ["dugun", "nisan", "kina", "soz", "sunnet", "davet", "kurumsal", "diger"],
    eventTypeLabel: "Organizasyon türü",
    packageServices: [
      "Yemek",
      "İçecek",
      "Pasta",
      "DJ",
      "Fotoğraf",
      "Video çekimi",
      "Servis personeli",
    ],
    suggestedExtras: [
      { name: "Fotoğraf & Video", amount: 10000 },
      { name: "Premium Dekorasyon", amount: 15000 },
      { name: "Müzik / DJ", amount: 12000 },
      { name: "Ekstra saat", amount: 5000 },
    ],
    usesLocation: false,
    usesTeams: false,
    usesDelivery: false,
  },
  fotografci: {
    label: "Fotoğrafçı",
    description:
      "Düğün, nişan ve dış çekim hizmeti veriyorsanız. Takvim plato bazında tutulur.",
    resource: { singular: "Plato", plural: "Platolar" },
    resourceNew: "Yeni plato",
    resourceEmpty: "Henüz plato eklenmemiş",
    resourceField: "Plato",
    event: {
      singular: "çekim",
      plural: "çekimler",
      dative: "çekime",
      genitive: "çekimin",
      ablativePlural: "çekimlerden",
      accusativePlural: "çekimleri",
      possessive: "çekiminiz",
    },
    businessPlaceholder: "Ela Fotoğrafçılık",
    resourcePlaceholder: "A Platosu",
    resourceDescPlaceholder: "120 m², sonsuz fon, stüdyo aydınlatması",
    usesGuestCount: false,
    // Stüdyonun kendi iş listesi (0039). Salonun organizasyon kalemleri
    // burada yok; düğün ile nişan tek kalemde birleşiyor.
    eventTypes: [
      "dis_cekim",
      "dugun_nisan",
      "vesikalik",
      "portre",
      "studyo",
      "urun",
      "video_etkinlik",
      "diger",
    ],
    eventTypeLabel: "Tür",
    packageServices: [
      "2 saat fotoğraf çekimi",
      "1 adet albüm",
      "500 adet dijital fotoğraf",
      "1 adet klip",
    ],
    suggestedExtras: [
      { name: "Dış çekim", amount: 12000 },
      { name: "Drone çekimi", amount: 6000 },
      { name: "Albüm", amount: 8000 },
      { name: "Video klip", amount: 10000 },
      { name: "Save the date", amount: 5000 },
      { name: "Ekstra saat", amount: 4000 },
    ],
    usesLocation: true,
    usesTeams: true,
    usesDelivery: true,
  },
};

export function vertical(type: BusinessType | undefined | null): Vertical {
  return VERTICALS[type ?? "salon"] ?? VERTICALS.salon;
}

/** Seçim ekranında gösterilecek sıra. */
export const BUSINESS_TYPES: BusinessType[] = ["salon", "fotografci"];

/** Türkçe'ye uygun baş harf büyütme ("i" → "İ"). */
export function buyukHarf(s: string): string {
  return s.charAt(0).toLocaleUpperCase("tr") + s.slice(1);
}
