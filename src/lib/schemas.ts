import { z } from "zod";

const trimmed = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, `${label} en az ${min} karakter olmalı.`)
    .max(max, `${label} çok uzun.`);

/**
 * Opsiyonel alanlar `null` girdiyi de kabul etmek ZORUNDA.
 * Form önce tarayıcıda doğrulanır ve zodResolver, submit'e şemanın
 * DÖNÜŞTÜRÜLMÜŞ çıktısını verir (boş metin -> null). Aynı şema sunucuda
 * tekrar çalıştığı için şemanın idempotent olması gerekir:
 * parse(parse(x)) === parse(x). Aksi halde ikinci geçiş "Expected string,
 * received null" ile patlar.
 */
const optionalText = z
  .string()
  .trim()
  .max(2000, "Metin çok uzun.")
  .nullish()
  .transform((v) => (v ? v : null));

/** Formdan gelen "120.000,50" veya "120000.5" girdisini sayıya çevirir. */
export const moneyField = z
  .union([z.number(), z.string()])
  .transform((v) => {
    if (typeof v === "number") return v;
    const cleaned = v.trim().replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
    return cleaned === "" ? 0 : Number(cleaned);
  })
  .refine((n) => Number.isFinite(n) && n >= 0, "Geçerli bir tutar girin.")
  .refine((n) => n <= 99_999_999.99, "Tutar çok büyük.")
  // Kuruş hassasiyeti: numeric(12,2) ile birebir uyum.
  .transform((n) => Math.round(n * 100) / 100);

const optionalPositiveInt = z
  .union([z.number(), z.string()])
  .nullish()
  .transform((v) => {
    if (v === undefined || v === "" || v === null) return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(/\D/g, ""));
    return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
  });

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Geçerli bir tarih seçin.");
const optionalIsoDate = z
  .string()
  .nullish()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Geçerli bir tarih seçin.");
const time = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Geçerli bir saat girin.");
const uuid = z.string().uuid("Geçersiz seçim.");
const optionalUuid = z
  .string()
  .nullish()
  .transform((v) => (v && v !== "none" ? v : null))
  .refine((v) => v === null || z.string().uuid().safeParse(v).success, "Geçersiz seçim.");

// --- Hesap -------------------------------------------------------------------

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Mevcut şifrenizi girin."),
    password: z.string().min(8, "Yeni şifre en az 8 karakter olmalı."),
    passwordAgain: z.string(),
  })
  .refine((v) => v.password === v.passwordAgain, {
    message: "Yeni şifreler eşleşmiyor.",
    path: ["passwordAgain"],
  })
  .refine((v) => v.password !== v.currentPassword, {
    message: "Yeni şifre mevcut şifrenizden farklı olmalı.",
    path: ["password"],
  });
export type ChangePasswordInput = z.input<typeof changePasswordSchema>;

// --- Salon -------------------------------------------------------------------

export const venueSchema = z.object({
  id: z.string().uuid().optional(),
  name: trimmed(1, 120, "Salon adı"),
  capacity: optionalPositiveInt,
  description: optionalText,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Geçersiz renk."),
  is_active: z.boolean(),
});
export type VenueInput = z.input<typeof venueSchema>;

// --- Paket -------------------------------------------------------------------

export const packageSchema = z.object({
  id: z.string().uuid().optional(),
  name: trimmed(1, 120, "Paket adı"),
  description: optionalText,
  base_price: moneyField,
  venue_id: optionalUuid,
  pricing_type: z.enum(["sabit", "kisi_basi"]),
  included_services: z.array(z.string().trim().min(1).max(120)).max(30),
  is_active: z.boolean(),
});
export type PackageInput = z.input<typeof packageSchema>;

// --- Müşteri -----------------------------------------------------------------

const phone = z
  .string()
  .trim()
  .min(7, "Telefon numarası eksik.")
  .max(20, "Telefon numarası çok uzun.")
  .refine((v) => v.replace(/\D/g, "").length >= 10, "Geçerli bir telefon numarası girin.");

export const customerSchema = z.object({
  id: z.string().uuid().optional(),
  full_name: trimmed(2, 160, "Ad soyad"),
  phone,
  phone2: z
    .string()
    .trim()
    .nullish()
    .transform((v) => (v ? v : null))
    .refine(
      (v) => v === null || v.replace(/\D/g, "").length >= 10,
      "İkinci telefon geçersiz.",
    ),
  email: z
    .string()
    .trim()
    .nullish()
    .transform((v) => (v ? v : null))
    .refine(
      (v) => v === null || z.string().email().safeParse(v).success,
      "Geçerli bir e-posta adresi girin.",
    ),
  address: optionalText,
  // KVKK: zorunlu değil. Girilirse 11 hane olmalı.
  national_id: z
    .string()
    .trim()
    .nullish()
    .transform((v) => (v ? v.replace(/\D/g, "") : null))
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^[0-9]{11}$/.test(v), "T.C. Kimlik No 11 haneli olmalı."),
  notes: optionalText,
});
export type CustomerInput = z.input<typeof customerSchema>;

// --- Sözleşme şablonu --------------------------------------------------------

export const contractTemplateSchema = z.object({
  body: z
    .string()
    .trim()
    .min(50, "Sözleşme metni çok kısa.")
    .max(40000, "Sözleşme metni çok uzun."),
});
export type ContractTemplateInput = z.input<typeof contractTemplateSchema>;

// --- Rezervasyon -------------------------------------------------------------

export const reservationSchema = z
  .object({
    id: z.string().uuid().optional(),
    customer_id: uuid,
    venue_id: uuid,
    package_id: optionalUuid,
    organization_type: z.enum([
      "dugun", "nisan", "kina", "soz", "sunnet", "davet", "kurumsal", "diger",
    ]),
    status: z.enum([
      "kesinlesti", "tamamlandi", "iptal_edildi",
    ]),
    event_date: isoDate,
    start_time: time,
    end_time: time,
    guest_count: optionalPositiveInt,
    notes: optionalText,
    gross_amount: moneyField,
    discount_amount: moneyField,
    due_date: optionalIsoDate,
    // Kişi başı anlaşıldıysa birim fiyat. Toplam (gross_amount) yine tek
    // gerçek kaynaktır; bu alan dökümü gösterebilmek için saklanır.
    pricing_type: z.enum(["sabit", "kisi_basi"]),
    unit_price: moneyField.nullish(),
    // Yalnızca yeni kayıtta kullanılır: girilirse ilk tahsilat kaydı açılır.
    deposit_amount: moneyField.nullish(),
  })
  .refine((v) => v.discount_amount <= v.gross_amount, {
    message: "İndirim, toplam fiyattan büyük olamaz.",
    path: ["discount_amount"],
  })
  .refine((v) => v.start_time !== v.end_time, {
    message: "Başlangıç ve bitiş saati aynı olamaz.",
    path: ["end_time"],
  })
  .refine((v) => (v.deposit_amount ?? 0) <= v.gross_amount - v.discount_amount, {
    message: "Kapora, net satış tutarından büyük olamaz.",
    path: ["deposit_amount"],
  })
  .refine((v) => v.pricing_type !== "kisi_basi" || (v.unit_price ?? 0) > 0, {
    message: "Kişi başı fiyat girin.",
    path: ["unit_price"],
  })
  .refine((v) => v.pricing_type !== "kisi_basi" || (v.guest_count ?? 0) > 0, {
    message: "Kişi başı fiyatlandırma için kişi sayısı gerekir.",
    path: ["guest_count"],
  });
export type ReservationInput = z.input<typeof reservationSchema>;

// --- Tahsilat / Gelir --------------------------------------------------------

export const paymentSchema = z.object({
  reservation_id: optionalUuid,
  customer_id: optionalUuid,
  amount: moneyField.refine((n) => n > 0, "Tutar sıfırdan büyük olmalı."),
  payment_date: isoDate,
  method: z.enum(["nakit", "kredi_karti", "havale_eft", "diger"]),
  category: z.enum(["kapora", "ara_odeme", "son_odeme", "ek_hizmet", "diger"]),
  description: optionalText,
});
export type PaymentInput = z.input<typeof paymentSchema>;

// --- Gider -------------------------------------------------------------------

export const expenseSchema = z.object({
  category_id: uuid,
  reservation_id: optionalUuid,
  amount: moneyField.refine((n) => n > 0, "Tutar sıfırdan büyük olmalı."),
  expense_date: isoDate,
  method: z.enum(["nakit", "kredi_karti", "havale_eft", "diger"]),
  description: optionalText,
  vendor: z
    .string()
    .trim()
    .max(160, "Tedarikçi adı çok uzun.")
    .nullish()
    .transform((v) => (v ? v : null)),
});
export type ExpenseInput = z.input<typeof expenseSchema>;

export const expenseCategorySchema = z.object({
  id: z.string().uuid().optional(),
  name: trimmed(1, 80, "Kategori adı"),
  is_active: z.boolean().default(true),
});
export type ExpenseCategoryInput = z.input<typeof expenseCategorySchema>;

// --- İptal (void) ------------------------------------------------------------

export const voidSchema = z.object({
  id: uuid,
  reason: trimmed(3, 300, "İptal nedeni"),
});

// --- İşletme ayarları --------------------------------------------------------

const optionalShort = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} çok uzun.`)
    .nullish()
    .transform((v) => (v ? v : null));

export const businessSchema = z.object({
  name: trimmed(2, 120, "İşletme adı"),
  authorized_person: optionalShort(120, "Yetkili kişi"),
  email: z
    .string()
    .trim()
    .nullish()
    .transform((v) => (v ? v : null))
    .refine(
      (v) => v === null || z.string().email().safeParse(v).success,
      "Geçerli bir e-posta adresi girin.",
    ),
  address: optionalShort(400, "Adres"),
  tax_office: optionalShort(120, "Vergi dairesi"),
  tax_number: optionalShort(20, "Vergi numarası"),
  logo_url: optionalShort(500, "İşletme logosu"),
  phone: z
    .string()
    .trim()
    .max(20)
    .nullish()
    .transform((v) => (v ? v : null)),
  city: z
    .string()
    .trim()
    .max(80)
    .nullish()
    .transform((v) => (v ? v : null)),
});
export type BusinessInput = z.input<typeof businessSchema>;

// --- Talepler ve teklifler ---------------------------------------------------

const optionalEmail = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v ? v : null))
  .refine(
    (v) => v === null || z.string().email().safeParse(v).success,
    "Geçerli bir e-posta adresi girin.",
  );

/** datetime-local girdisi ("2026-09-03T14:00") veya ISO damgası. */
const optionalDateTime = z
  .string()
  .nullish()
  .transform((v) => (v ? v : null))
  .refine(
    (v) => v === null || !Number.isNaN(new Date(v).getTime()),
    "Geçerli bir tarih ve saat seçin.",
  );

const optionalTime = z
  .string()
  .nullish()
  .transform((v) => (v ? v : null))
  .refine(
    (v) => v === null || /^\d{2}:\d{2}(:\d{2})?$/.test(v),
    "Geçerli bir saat girin.",
  );

/**
 * Yeni talep. Amaç 30-60 saniyede kayıt açmak: yalnızca müşteri adı, telefon,
 * organizasyon türü ve kaynak zorunlu. Tarih/salon/saat sonradan netleşebilir.
 */
export const leadSchema = z
  .object({
    id: z.string().uuid().optional(),
    // Mevcut müşteri seçildiyse id gelir; yoksa ad+telefonla yeni kayıt açılır.
    customer_id: optionalUuid,
    full_name: trimmed(2, 120, "Ad soyad"),
    phone: trimmed(7, 20, "Telefon"),
    phone2: optionalShort(20, "İkinci telefon"),
    email: optionalEmail,

    organization_type: z.enum([
      "dugun", "nisan", "kina", "soz", "sunnet", "davet", "kurumsal", "diger",
    ]),
    source: z.enum([
      "whatsapp", "instagram", "telefon", "yuz_yuze", "web", "referans",
      "google", "diger",
    ]),
    venue_id: optionalUuid,
    package_id: optionalUuid,
    event_date: optionalIsoDate,
    start_time: optionalTime,
    end_time: optionalTime,
    guest_count: optionalPositiveInt,
    assigned_to: optionalUuid,
    next_follow_up_at: optionalDateTime,
    notes: optionalText,
  })
  // Veritabanındaki leads_time_pair kısıtının form karşılığı.
  .refine(
    (v) => (v.start_time === null) === (v.end_time === null),
    { message: "Başlangıç ve bitiş saatini birlikte girin.", path: ["end_time"] },
  );
export type LeadInput = z.input<typeof leadSchema>;

export const leadActivitySchema = z.object({
  lead_id: uuid,
  type: z.enum(["telefon", "whatsapp", "instagram", "yuz_yuze", "eposta", "not"]),
  note: trimmed(2, 2000, "Not"),
  occurred_at: optionalDateTime,
});
export type LeadActivityInput = z.input<typeof leadActivitySchema>;

export const leadLostSchema = z
  .object({
    lead_id: uuid,
    lost_reason: z.enum([
      "fiyat", "tarih", "baska_salon", "vazgecti", "ulasilamadi", "diger",
    ]),
    lost_note: optionalText,
  })
  .refine((v) => v.lost_reason !== "diger" || (v.lost_note ?? "").length > 2, {
    message: "\"Diğer\" seçtiğinizde kısa bir açıklama yazın.",
    path: ["lost_note"],
  });
export type LeadLostInput = z.input<typeof leadLostSchema>;

export const quoteItemSchema = z.object({
  name: trimmed(2, 120, "Hizmet adı"),
  amount: moneyField,
});

export const quoteSchema = z
  .object({
    lead_id: uuid,
    venue_id: optionalUuid,
    package_id: optionalUuid,
    guest_count: optionalPositiveInt,
    package_amount: moneyField,
    discount_amount: moneyField,
    valid_until: optionalIsoDate,
    notes: optionalText,
    items: z.array(quoteItemSchema).max(20, "En fazla 20 ek hizmet eklenebilir."),
  })
  .refine(
    (v) =>
      v.discount_amount <=
      v.package_amount + v.items.reduce((sum, i) => sum + i.amount, 0),
    { message: "İndirim, teklif toplamını aşamaz.", path: ["discount_amount"] },
  );
export type QuoteInput = z.input<typeof quoteSchema>;

export const holdSchema = z.object({
  lead_id: uuid,
  venue_id: uuid,
  event_date: isoDate,
  start_time: time,
  end_time: time,
  expires_at: z.string().min(1, "Opsiyon bitiş zamanını seçin."),
  note: optionalText,
});
export type HoldInput = z.input<typeof holdSchema>;

/** Talebi rezervasyona dönüştürme ekranı. */
export const convertLeadSchema = z.object({
  lead_id: uuid,
  quote_id: optionalUuid,
  venue_id: uuid,
  package_id: optionalUuid,
  event_date: isoDate,
  start_time: time,
  end_time: time,
  guest_count: optionalPositiveInt,
  gross_amount: moneyField,
  discount_amount: moneyField,
  deposit_amount: moneyField,
  due_date: optionalIsoDate,
  notes: optionalText,
});
export type ConvertLeadInput = z.input<typeof convertLeadSchema>;

/**
 * Abonelik süresi uzatma (platform yönetimi).
 *
 * Gün sayısı üst sınırı veritabanındaki admin_extend_access() ile aynı: iki
 * tarafta da 1–3650. Sunucu son söz sahibi, buradaki kontrol yalnızca formda
 * anlaşılır hata verebilmek için.
 */
export const extendAccessSchema = z.object({
  business_id: uuid,
  days: z
    .union([z.number(), z.string()])
    .transform((v) => {
      const n = typeof v === "number" ? v : Number(String(v).replace(/\D/g, ""));
      return Number.isFinite(n) ? Math.trunc(n) : Number.NaN;
    })
    .refine((n) => Number.isFinite(n), "Gün sayısı girin.")
    .refine((n) => n >= 1, "En az 1 gün.")
    .refine((n) => n <= 3650, "En fazla 3650 gün."),
  note: optionalText,
});
export type ExtendAccessInput = z.input<typeof extendAccessSchema>;
