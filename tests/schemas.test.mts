/**
 * Şema testleri.
 *
 * En kritik kural: şemalar İDEMPOTENT olmalı — parse(parse(x)) === parse(x).
 * Çünkü form önce tarayıcıda doğrulanıyor ve zodResolver submit'e şemanın
 * dönüştürülmüş çıktısını veriyor; aynı şema sunucuda ikinci kez çalışıyor.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  businessSchema,
  changePasswordSchema,
  contractTemplateSchema,
  convertLeadSchema,
  holdSchema,
  leadActivitySchema,
  leadLostSchema,
  leadSchema,
  quoteSchema,
  customerSchema,
  expenseCategorySchema,
  expenseSchema,
  extendAccessSchema,
  packageSchema,
  paymentSchema,
  reservationSchema,
  venueSchema,
} from "../src/lib/schemas.ts";
import type { ZodTypeAny } from "zod";

const samples: [string, ZodTypeAny, unknown][] = [
  [
    "extendAccessSchema (gün metin)",
    extendAccessSchema,
    { business_id: "11111111-1111-1111-1111-111111111111", days: "30", note: "" },
  ],
  [
    "extendAccessSchema (gün sayı, not dolu)",
    extendAccessSchema,
    { business_id: "11111111-1111-1111-1111-111111111111", days: 365, note: "12 ay havale" },
  ],
  [
    "venueSchema (boş opsiyoneller)",
    venueSchema,
    { name: "Balo Salonu", capacity: "", description: "", color: "#6366f1", is_active: true },
  ],
  [
    "venueSchema (dolu)",
    venueSchema,
    { id: "11111111-1111-1111-1111-111111111111", name: "Kır Bahçesi", capacity: "300", description: "Açık alan", color: "#14b8a6", is_active: false },
  ],
  [
    "packageSchema (kişi başı)",
    packageSchema,
    { name: "Menü", description: "", base_price: "850", pricing_type: "kisi_basi", included_services: [], is_active: true },
  ],
  [
    "packageSchema",
    packageSchema,
    { name: "Gold", description: "", base_price: "120.000", pricing_type: "sabit", included_services: ["Yemek", "DJ"], is_active: true },
  ],
  [
    "customerSchema (yalnızca zorunlu alanlar)",
    customerSchema,
    { full_name: "Reyhan & Ömer Özdemir", phone: "05389275728", phone2: "", email: "", address: "", national_id: "", notes: "Kır düğünü istiyorlar." },
  ],
  [
    "customerSchema (tüm alanlar)",
    customerSchema,
    { full_name: "Zeynep & Ali", phone: "0532 111 22 33", phone2: "05439998877", email: "a@b.com", address: "Bahçelievler Mah. No:12", national_id: "10000000146", notes: "" },
  ],
  [
    "reservationSchema (paketsiz, kaporasız)",
    reservationSchema,
    {
      customer_id: "22222222-2222-2222-2222-222222222222",
      venue_id: "33333333-3333-3333-3333-333333333333",
      package_id: "none",
      organization_type: "dugun",
      status: "kesinlesti",
      event_date: "2026-09-12",
      start_time: "19:00",
      end_time: "01:00",
      guest_count: "",
      notes: "",
      pricing_type: "sabit",
      gross_amount: "120.000",
      discount_amount: "",
      due_date: undefined,
      deposit_amount: 0,
    },
  ],
  [
    "reservationSchema (paketli, kaporalı)",
    reservationSchema,
    {
      customer_id: "22222222-2222-2222-2222-222222222222",
      venue_id: "33333333-3333-3333-3333-333333333333",
      package_id: "44444444-4444-4444-4444-444444444444",
      organization_type: "kina",
      status: "kesinlesti",
      event_date: "2026-09-12",
      start_time: "13:00",
      end_time: "17:00",
      guest_count: "300",
      notes: "Yemekli menü",
      pricing_type: "sabit",
      gross_amount: 120000,
      discount_amount: 20000,
      due_date: "2026-09-01",
      deposit_amount: "30.000",
    },
  ],
  [
    "paymentSchema (manuel gelir)",
    paymentSchema,
    { reservation_id: "none", customer_id: "none", amount: "30.000", payment_date: "2026-09-01", method: "nakit", category: "diger", description: "" },
  ],
  [
    "expenseSchema (genel gider)",
    expenseSchema,
    { category_id: "55555555-5555-5555-5555-555555555555", reservation_id: "none", amount: "51.000", expense_date: "2026-09-12", method: "havale_eft", description: "", vendor: "" },
  ],
  ["expenseCategorySchema", expenseCategorySchema, { name: "Havai fişek", is_active: true }],
  [
    "businessSchema (boş opsiyoneller)",
    businessSchema,
    { name: "Gül Düğün Salonu", phone: "", city: "", authorized_person: "", email: "", address: "", tax_office: "", tax_number: "", logo_url: "" },
  ],
  [
    "businessSchema (sözleşme alanları dolu)",
    businessSchema,
    { name: "Gül Düğün Salonu", phone: "0212 000 00 00", city: "İstanbul", authorized_person: "Ayşe Gül", email: "info@gul.com", address: "Merkez Mah. No:5", tax_office: "Kadıköy", tax_number: "1234567890", logo_url: "https://ornek.com/logo.png" },
  ],
  [
    "leadSchema (yalnızca zorunlu alanlar)",
    leadSchema,
    { customer_id: "none", full_name: "Reyhan & Ömer", phone: "05551234567", phone2: "", email: "", organization_type: "dugun", source: "whatsapp", venue_id: "none", package_id: "none", event_date: "", alt_event_date: "", start_time: "", end_time: "", guest_count: "", assigned_to: "none", next_follow_up_at: "", notes: "" },
  ],
  [
    "leadSchema (tüm alanlar dolu)",
    leadSchema,
    { customer_id: "44444444-4444-4444-4444-444444444444", full_name: "Selin & Kaan", phone: "0532 111 22 33", phone2: "05439998877", email: "a@b.com", organization_type: "nisan", source: "instagram", venue_id: "55555555-5555-5555-5555-555555555555", package_id: "66666666-6666-6666-6666-666666666666", event_date: "2026-09-05", alt_event_date: "2026-09-12", start_time: "19:00", end_time: "23:00", guest_count: "450", assigned_to: "77777777-7777-7777-7777-777777777777", next_follow_up_at: "2026-09-03T14:00", notes: "Kır düğünü" },
  ],
  [
    "leadActivitySchema",
    leadActivitySchema,
    { lead_id: "44444444-4444-4444-4444-444444444444", type: "telefon", note: "Müşteri Gold Paket fiyatı istedi.", occurred_at: "" },
  ],
  [
    "leadLostSchema",
    leadLostSchema,
    { lead_id: "44444444-4444-4444-4444-444444444444", lost_reason: "fiyat", lost_note: "" },
  ],
  [
    "quoteSchema (ek hizmetli)",
    quoteSchema,
    { lead_id: "44444444-4444-4444-4444-444444444444", venue_id: "none", package_id: "none", guest_count: "450", package_amount: "150.000", discount_amount: "15.000", valid_until: "2026-09-10", notes: "", items: [{ name: "Fotoğraf & Video", amount: "10.000" }, { name: "Premium Dekorasyon", amount: 20000 }] },
  ],
  [
    "holdSchema",
    holdSchema,
    { lead_id: "44444444-4444-4444-4444-444444444444", venue_id: "55555555-5555-5555-5555-555555555555", event_date: "2026-09-05", start_time: "19:00", end_time: "23:00", expires_at: "2026-09-03T18:00", note: "" },
  ],
  [
    "convertLeadSchema",
    convertLeadSchema,
    { lead_id: "44444444-4444-4444-4444-444444444444", quote_id: "none", venue_id: "55555555-5555-5555-5555-555555555555", package_id: "none", event_date: "2026-09-05", start_time: "19:00", end_time: "23:00", guest_count: "450", gross_amount: "165.000", discount_amount: 0, deposit_amount: "30.000", due_date: "", notes: "" },
  ],
  [
    "changePasswordSchema",
    changePasswordSchema,
    { currentPassword: "eskiSifre1", password: "yeniSifre1", passwordAgain: "yeniSifre1" },
  ],
  [
    "contractTemplateSchema",
    contractTemplateSchema,
    { body: "# ORGANİZASYON HİZMET SÖZLEŞMESİ\n\n## 1. TARAFLAR\nİşbu sözleşme {{business_name}} ile {{customer_name}} arasında düzenlenmiştir." },
  ],
];

for (const [label, schema, input] of samples) {
  test(`${label}: ilk geçiş başarılı`, () => {
    const first = schema.safeParse(input);
    assert.ok(first.success, `Beklenmedik hata: ${first.success ? "" : first.error.issues[0]?.message}`);
  });

  test(`${label}: çıktı tekrar doğrulanabiliyor (idempotent)`, () => {
    const first = schema.parse(input);
    const second = schema.safeParse(first);
    assert.ok(
      second.success,
      `İkinci geçiş başarısız — sunucu tarafı doğrulama patlar: ${
        second.success ? "" : second.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")
      }`,
    );
    assert.deepEqual(second.data, first, "İkinci geçiş farklı sonuç üretti");
  });
}

test("boş metin null'a dönüşür", () => {
  const out = customerSchema.parse({ full_name: "Ad Soyad", phone: "05321112233", phone2: "", email: "", notes: "" });
  assert.equal(out.phone2, null);
  assert.equal(out.email, null);
  assert.equal(out.notes, null);
});

test("Türk para biçimi doğru okunur", () => {
  const out = packageSchema.parse({ name: "X", base_price: "120.000,50", pricing_type: "sabit", included_services: [], is_active: true, description: "" });
  assert.equal(out.base_price, 120000.5);
});

test("indirim toplam fiyatı aşamaz", () => {
  const base = {
    customer_id: "22222222-2222-2222-2222-222222222222",
    venue_id: "33333333-3333-3333-3333-333333333333",
    package_id: "none", organization_type: "dugun", status: "kesinlesti",
    event_date: "2026-09-12", start_time: "19:00", end_time: "23:00",
    guest_count: "", notes: "", due_date: undefined, deposit_amount: 0,
    pricing_type: "sabit" as const,
  };
  const result = reservationSchema.safeParse({ ...base, gross_amount: 1000, discount_amount: 2000 });
  assert.ok(!result.success);
  assert.match(result.error.issues[0].message, /İndirim/);
});

test("kapora net satışı aşamaz", () => {
  const result = reservationSchema.safeParse({
    customer_id: "22222222-2222-2222-2222-222222222222",
    venue_id: "33333333-3333-3333-3333-333333333333",
    package_id: "none", organization_type: "dugun", status: "kesinlesti",
    event_date: "2026-09-12", start_time: "19:00", end_time: "23:00",
    guest_count: "", notes: "", due_date: undefined, pricing_type: "sabit",
    gross_amount: 10000, discount_amount: 0, deposit_amount: 50000,
  });
  assert.ok(!result.success);
  assert.match(result.error.issues[0].message, /Kapora/);
});

test("kişi başı: birim fiyat zorunlu", () => {
  const r = reservationSchema.safeParse({
    customer_id: "22222222-2222-2222-2222-222222222222",
    venue_id: "33333333-3333-3333-3333-333333333333",
    package_id: "none", organization_type: "dugun", status: "kesinlesti",
    event_date: "2026-09-12", start_time: "19:00", end_time: "23:00",
    guest_count: "400", notes: "", due_date: undefined,
    pricing_type: "kisi_basi", unit_price: 0,
    gross_amount: 0, discount_amount: 0, deposit_amount: 0,
  });
  assert.ok(!r.success);
  assert.match(r.error.issues[0].message, /Kişi başı fiyat/);
});

test("kişi başı: kişi sayısı zorunlu", () => {
  const r = reservationSchema.safeParse({
    customer_id: "22222222-2222-2222-2222-222222222222",
    venue_id: "33333333-3333-3333-3333-333333333333",
    package_id: "none", organization_type: "dugun", status: "kesinlesti",
    event_date: "2026-09-12", start_time: "19:00", end_time: "23:00",
    guest_count: "", notes: "", due_date: undefined,
    pricing_type: "kisi_basi", unit_price: 850,
    gross_amount: 0, discount_amount: 0, deposit_amount: 0,
  });
  assert.ok(!r.success);
  assert.match(r.error.issues[0].message, /kişi sayısı/i);
});

test("kişi başı: geçerli girdi kabul edilir ve idempotent", () => {
  const input = {
    customer_id: "22222222-2222-2222-2222-222222222222",
    venue_id: "33333333-3333-3333-3333-333333333333",
    package_id: "none", organization_type: "dugun" as const, status: "kesinlesti" as const,
    event_date: "2026-09-12", start_time: "19:00", end_time: "23:00",
    guest_count: "400", notes: "", due_date: undefined,
    pricing_type: "kisi_basi" as const, unit_price: "850",
    gross_amount: 340000, discount_amount: 0, deposit_amount: 0,
  };
  const first = reservationSchema.parse(input);
  assert.equal(first.unit_price, 850);
  assert.equal(first.guest_count, 400);
  assert.ok(reservationSchema.safeParse(first).success, "ikinci geçiş başarısız");
});
