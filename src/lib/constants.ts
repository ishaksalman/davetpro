import type {
  ContractStatus,
  HoldStatus,
  IncomeCategory,
  LeadActivityType,
  LeadLostReason,
  LeadSource,
  LeadStatus,
  QuoteStatus,
  OrganizationType,
  PaymentMethod,
  PricingType,
  ReservationStatus,
  UserRole,
} from "@/lib/database.types";

export const ORGANIZATION_TYPE_LABELS: Record<OrganizationType, string> = {
  dugun: "Düğün",
  nisan: "Nişan",
  kina: "Kına",
  soz: "Söz",
  sunnet: "Sünnet",
  davet: "Davet",
  kurumsal: "Kurumsal Etkinlik",
  diger: "Diğer",
};

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  kesinlesti: "Oluşturuldu",
  tamamlandi: "Tamamlandı",
  iptal_edildi: "İptal edildi",
};

/** Rozet renkleri — durumun aciliyetini/kesinliğini renkle anlatır. */
/**
 * Arayüzde seçilebilen rezervasyon durumları.
 *
 * 'on_gorusme' ve 'opsiyonlu' listede yok: satış hattı Talepler modülünde.
 * Etiketleri aşağıda duruyor, çünkü 0019 öncesinden kalmış kayıtlar hâlâ bu
 * değerleri taşıyor olabilir ve rozetleri doğru yazılmalı.
 */
export const RESERVATION_STATUS_FLOW: ReservationStatus[] = [
  "kesinlesti",
  "tamamlandi",
  "iptal_edildi",
];

export const RESERVATION_STATUS_STYLES: Record<ReservationStatus, string> = {
  kesinlesti:
    "bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-900",
  tamamlandi:
    "bg-blue-100 text-blue-800 ring-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:ring-blue-900",
  iptal_edildi:
    "bg-rose-100 text-rose-800 ring-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:ring-rose-900",
};

export const PRICING_TYPE_LABELS: Record<PricingType, string> = {
  sabit: "Sabit fiyat",
  kisi_basi: "Kişi başı fiyat",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  nakit: "Nakit",
  kredi_karti: "Kredi Kartı",
  havale_eft: "Havale / EFT",
  diger: "Diğer",
};

export const INCOME_CATEGORY_LABELS: Record<IncomeCategory, string> = {
  kapora: "Kapora",
  ara_odeme: "Ara ödeme",
  son_odeme: "Son ödeme",
  ek_hizmet: "Ek hizmet",
  diger: "Diğer",
};

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  taslak: "Taslak",
  olusturuldu: "Oluşturuldu",
  imzalandi: "İmzalandı",
  iptal: "İptal",
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  owner: "İşletme Sahibi",
  manager: "Yönetici",
  staff: "Personel",
};

export const WEEKDAY_LABELS = [
  "Pazar",
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
] as const;

/** Yeni salon eklerken sırayla önerilen renkler. */
export const VENUE_COLORS = [
  "#6366f1",
  "#ec4899",
  "#14b8a6",
  "#f59e0b",
  "#8b5cf6",
  "#06b6d4",
  "#ef4444",
  "#84cc16",
] as const;

export function enumOptions<T extends string>(
  labels: Record<T, string>,
): { value: T; label: string }[] {
  return (Object.keys(labels) as T[]).map((value) => ({
    value,
    label: labels[value],
  }));
}

// --- Satış hattı -------------------------------------------------------------

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  yeni: "Yeni talep",
  teklif_verildi: "Teklif verildi",
  opsiyonlu: "Opsiyonlu",
  kazanildi: "Kazanıldı",
  kaybedildi: "Kaybedildi",
};

/** Kanban sütun sırası; satış hattının doğal akışı. */
export const LEAD_PIPELINE: LeadStatus[] = [
  "yeni",
  "teklif_verildi",
  "opsiyonlu",
  "kazanildi",
  "kaybedildi",
];


export const LEAD_STATUS_STYLES: Record<LeadStatus, string> = {
  yeni: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  teklif_verildi: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  opsiyonlu: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  kazanildi: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  kaybedildi: "bg-muted text-muted-foreground",
};

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  telefon: "Telefon",
  yuz_yuze: "Mekana geldi",
  web: "Web sitesi",
  referans: "Referans",
  google: "Google",
  diger: "Diğer",
};

export const LEAD_LOST_REASON_LABELS: Record<LeadLostReason, string> = {
  fiyat: "Fiyat yüksek",
  tarih: "Tarih uygun değildi",
  baska_salon: "Başka salon seçti",
  vazgecti: "Müşteri vazgeçti",
  ulasilamadi: "Ulaşılamadı",
  diger: "Diğer",
};

export const LEAD_ACTIVITY_LABELS: Record<LeadActivityType, string> = {
  telefon: "Telefon görüşmesi",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  yuz_yuze: "Yüz yüze görüşme",
  eposta: "E-posta",
  not: "Not",
  sistem: "Sistem",
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  taslak: "Taslak",
  gonderildi: "Gönderildi",
  kabul: "Kabul edildi",
  reddedildi: "Reddedildi",
  suresi_doldu: "Süresi doldu",
};

export const HOLD_STATUS_LABELS: Record<HoldStatus, string> = {
  aktif: "Aktif",
  suresi_doldu: "Süresi doldu",
  donusturuldu: "Dönüştürüldü",
  iptal: "İptal",
};
