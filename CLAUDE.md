# DavetPro — geliştirme notları

Düğün salonu yönetim SaaS'ı. Multi-tenant, Türkçe arayüz.
Mimari kararların gerekçeleri için önce `README.md` oku.

## Değişmez kurallar

- **Tenant izolasyonu RLS ile.** Sorguya `business_id` filtresi eklemek gerekmez
  ve yeterli de değildir. Yeni tablo eklerken: `business_id` kolonu +
  `default current_business_id()` + RLS politikaları + bileşik unique `(id, business_id)`.
- **Para alanları `numeric(12,2)`.** Float yok. İstemcide toplama `sumMoney()` ile.
- **`payments` / `expenses` değiştirilemez.** Silme yok, tutar güncelleme yok;
  `voided_at` + `void_reason` ile iptal edilir. Trigger'lar bunu zorlar.
- **Kârlılık ve nakit akışı ayrı kavramlar.** Satış organizasyon tarihine,
  tahsilat/gider işlem tarihine göre. Arayüzde de karıştırma.
- **Finansal alanlar `reservation_pricing` tablosunda.** Rezervasyona fiyat
  kolonu ekleme — rol bazlı finans kısıtı bu ayrıma dayanıyor.

- **Sunucuda `new Date()` ile tarih türetme.** Gün/ay sınırları için
  `todayISO()` / `today()` (`src/lib/time.ts`) kullan — sunucu UTC'de çalışıyor.
- **Form gönderimlerinde `useSubmitGuard`.** `pending` bayrağı çift tıklamayı
  yakalamıyor; finansal kayıtlarda bu çift kayıt demek.
- **Sorgu hatasını yutma.** `.error` okunmadan `?? []` ile devam etmek, para
  ekranlarında ₺0 gösterir. Hata varsa `ErrorState` göster.

## Şema değiştirirken

1. `supabase/migrations/` altına yeni sıralı bir dosya ekle (mevcutları düzenleme).
2. `src/lib/database.types.ts` içindeki tipi güncelle.
3. `npm run test:db` çalıştır — testler PGlite üzerinde gerçek PostgreSQL kullanır.
4. Yeni davranış için `supabase/tests/schema.test.mjs` içine test ekle.

## Sunucu eylemi deseni

```ts
"use server";
export async function saveX(input: XInput): Promise<ActionResult> {
  await requireSession();
  const parsed = xSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);
  const supabase = await createClient();
  const { error } = await supabase.from("x").insert(parsed.data);
  if (error) return actionError(error);
  revalidatePath("/x");
  return { ok: true };
}
```

Şemalar `src/lib/schemas.ts` içinde tek yerde; istemci formu ve sunucu aynı
şemayı kullanır. Hata mesajları `toTurkishError()` ile çevrilir.

**Şemalar idempotent olmak ZORUNDA:** `parse(parse(x))` başarılı olmalı.
Form önce tarayıcıda doğrulanıyor ve zodResolver, submit'e şemanın
dönüştürülmüş çıktısını veriyor (boş metin → `null`); aynı şema sunucuda
ikinci kez çalışıyor. Bu yüzden opsiyonel alanlarda `.optional()` değil
`.nullish()` kullan. `npm run test:schemas` bu kuralı her şema için doğrular —
yeni şema eklerken örneğini `tests/schemas.test.mts` içine ekle.

## Arayüz

- Metinler Türkçe, tarih `dd.MM.yyyy`, para `₺120.000`.
- Liste ekranları `DataTable`, formlar `FormDialog` + `FormField` kullanır.
- **Sunucu bileşenlerinden Radix `asChild` içine JSX geçirme.** Pencere açan
  butonu `triggerButton={{ label, icon, variant, size }}` düz verisiyle tarif
  et; butonu istemci tarafında `FormDialog` kurar. Element olarak `trigger`
  yalnızca istemci bileşenlerinden verilir (ör. `DropdownMenuItem`).
- Boş / yükleniyor / hata durumlarını atlamadan yaz (`EmptyState`, `ErrorState`).
- Filtreleme bileşen içinde yapılıyorsa `DataTable`'a `totalCount` geç; yoksa
  filtre sonucu boş liste "hiç kayıt yok" gibi görünür.
