import type { BusinessType } from "@/lib/database.types";

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
  /** İşletme adı için örnek metin. */
  businessPlaceholder: string;
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
    businessPlaceholder: "Gül Düğün Salonu",
  },
  fotografci: {
    label: "Fotoğrafçı",
    description:
      "Düğün, nişan ve dış çekim hizmeti veriyorsanız. Takvim ekip bazında tutulur.",
    resource: { singular: "Ekip", plural: "Ekipler" },
    resourceNew: "Yeni ekip",
    resourceEmpty: "Henüz ekip eklenmemiş",
    resourceField: "Ekip",
    businessPlaceholder: "Ela Fotoğrafçılık",
  },
};

export function vertical(type: BusinessType | undefined | null): Vertical {
  return VERTICALS[type ?? "salon"] ?? VERTICALS.salon;
}

/** Seçim ekranında gösterilecek sıra. */
export const BUSINESS_TYPES: BusinessType[] = ["salon", "fotografci"];
