# DavetPro

Düğün salonları ve organizasyon mekanları için multi-tenant SaaS yönetim paneli.
Rezervasyon, takvim, müşteri, tahsilat, gider ve kârlılık takibi tek panelde.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui · Supabase (PostgreSQL + Auth)

---

## Kurulum

### 1. Supabase projesi

[supabase.com](https://supabase.com) üzerinde yeni bir proje açın, ardından
**SQL Editor**'de `supabase/migrations/` altındaki dosyaları **sırasıyla** çalıştırın:

```
0001_init.sql        → extension'lar, enum'lar, tablolar, kısıtlar
0002_functions.sql   → yardımcı fonksiyonlar, trigger'lar, kolon varsayılanları
0003_rls.sql         → Row Level Security politikaları
0004_views_rpc.sql   → view'lar, RPC'ler, izinler
0005_pricing_type.sql → kişi başı fiyatlandırma
0006_audit_fixes.sql  → fiyat satırı garantisi, müşteri bakiyesi düzeltmesi
```

> Zaten kurulu bir veritabanına yeni migration eklerken yalnızca eksik olan
> dosyaları sırasıyla çalıştırın; hepsi eklemeli (additive) yazılmıştır.

> Supabase CLI kullanıyorsanız `supabase db push` de aynı işi yapar.

### 2. Ortam değişkenleri

`.env.example` dosyasını `.env.local` olarak kopyalayın ve doldurun:

| Değişken | Nereden alınır | Zorunlu |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL | Evet |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → anon public | Evet |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → service_role | Personel daveti için |
| `NEXT_PUBLIC_APP_URL` | Uygulamanın adresi | Hayır (varsayılan localhost) |

`SUPABASE_SERVICE_ROLE_KEY` **asla** istemciye sızmamalıdır; yalnızca
`src/lib/supabase/admin.ts` içinden, çağıranın yöneticiliği doğrulandıktan sonra
kullanılır.

### 3. Çalıştırma

```bash
npm install && npm run dev
```

İlk kullanıcı `/kayit` adresinden işletmesini oluşturur ve otomatik olarak
**İşletme Sahibi** rolünü alır. E-posta doğrulaması açıksa kullanıcı, doğrulama
sonrası `/isletme-kur` adımında işletmesini tamamlar.

---

## Komutlar

```bash
npm run dev        # geliştirme sunucusu
npm run build      # üretim derlemesi (TypeScript kontrolü dahil)
npm run lint       # ESLint
npm run test:db      # veritabanı şeması + RLS testleri (PGlite, Docker gerekmez)
npm run test:schemas # zod şemaları (idempotentlik dahil)
npm run test:audit   # saldırgan denetim senaryoları (tenant sızıntısı, finans tutarsızlığı)
```

### Demo verisi

Boş bir panelde dashboard ve raporları değerlendirmek zor. Son 1 ay için
gerçekçi bir veri seti üretmek üzere:

```bash
node supabase/seed/demo.mjs            # ekle (tekrar çalıştırmak veriyi çoğaltmaz)
node supabase/seed/demo.mjs --temizle  # yalnızca demo kayıtlarını sil
```

Demo kayıtları `dddddddd-dddd-4ddd-8ddd-…` önekli sabit UUID'lerle yazılır, bu
yüzden gerçek kayıtlarınıza dokunmadan eksiksiz silinebilir.
`SUPABASE_SERVICE_ROLE_KEY` gerekir.

---

`npm run test:db` migration'ları gerçek bir PostgreSQL üzerinde (WASM) çalıştırır
ve tenant izolasyonu, çakışma kontrolü, finansal değişmezlik, rol bazlı finans
kısıtı gibi davranışları doğrular. **Şemayı her değiştirdiğinizde çalıştırın.**

---

## Mimari kararlar

### Tenant izolasyonu
Her tabloda `business_id` var, RLS `enable` + `force` durumda ve politikalar
`current_business_id()` (security definer) fonksiyonuna dayanıyor. İzolasyon
frontend filtrelerine bırakılmadı: sorgular `business_id` göndermese bile
kolon varsayılanı + `WITH CHECK` yanlış tenant'a yazmayı engelliyor. Ayrıca
tüm ilişkiler **bileşik yabancı anahtar** `(id, business_id)` üzerinden kurulu —
bir tenant'ın kaydı başka bir tenant'ın kaydına bağlanamıyor.

### Kârlılık ≠ nakit akışı
Bu ayrım şemaya kadar işlenmiş durumda:
- **Satış / kâr** organizasyon tarihine göre hesaplanır (`reservation_financials`).
- **Tahsilat / gider** işlem tarihine göre hesaplanır.
- `finance_summary()` ikisini ayrı kolonlarda döndürür; arayüz de ayrı başlıklar
  altında gösterir.

### Finansal kayıtlar değişmez
`payments` ve `expenses` kayıtları **silinemez** (`DELETE` yetkisi geri alınmış)
ve tutarı/bağlantısı **değiştirilemez** (trigger engeller). Hata olduğunda kayıt
`voided_at` + `void_reason` ile iptal edilip yenisi açılır. Böylece "kalan tutar"
ve geçmiş raporlar geriye dönük olarak bozulmaz, tam denetim izi kalır.

Ek koruma: tahsilat toplamı net satışı aşamaz, net satış da tahsil edilenin
altına indirilemez (her ikisi de trigger ile).

### Çakışma kontrolü
`reservations` üzerindeki `EXCLUDE USING gist` kısıtı, aynı salonda çakışan
tarih/saat aralığını **veritabanı seviyesinde** engeller (iptal edilenler hariç).
Arayüz kullanıcıyı ayrıca uyarır, ama gerçek garanti buradan gelir. Gece yarısını
aşan organizasyonlar (20:00 – 02:00) generated kolonlarla doğru hesaplanır.

### Finans yetkisi
Personelin finansal verileri görmemesi bir arayüz kararı değil: fiyat bilgisi
`reservations` tablosunda değil, ayrı bir `reservation_pricing` tablosunda tutulur
ve `payments` / `expenses` ile birlikte `can_see_finance()` kapısının arkasındadır.
Yetkisiz personel doğrudan sorgu atsa bile tutarları göremez.

### Saat dilimi
Gün ve ay sınırları sunucunun yereline değil **işletmenin saat dilimine** göre
hesaplanır (`src/lib/time.ts`, varsayılan `Europe/Istanbul`,
`NEXT_PUBLIC_APP_TIME_ZONE` ile değiştirilebilir). Sunucu UTC'de çalıştığında
Türkiye saatiyle 00:00–03:00 arasında "bugün" ve "bu ay" bir gün/ay geriye
kayıyordu.

### Çift gönderim
Formlar `useSubmitGuard` ile korunur. `useTransition`'ın `pending` bayrağı tek
başına yetmiyor: react-hook-form doğrulamayı `await` ettiği için ikinci tıklama
`pending` true olmadan geliyor ve tahsilat/gider iki kez yazılabiliyordu.

### Fiyatlandırma
Paketler sabit fiyatlı ya da kişi başı olabilir (`packages.pricing_type`).
Rezervasyonda kişi başı seçilirse form, birim fiyat × kişi sayısı hesabını
canlı yapar; ama **kaydedilen tek gerçek yine toplam tutardır**
(`reservation_pricing.gross_amount`). Birim fiyat yalnızca dökümü gösterebilmek
ve sonraki düzenlemede yeniden hesaplayabilmek için saklanır — böylece tahsilat
ve kârlılık hesapları tek bir sayıya dayanmaya devam eder.

### Deneme süresi ve abonelik
Her işletmenin `subscriptions` tablosunda tek satırı var: `trial_ends_at`
(kayıt + 30 gün, bir daha değişmez) ve `access_until` (kilidin tek yetkilisi).
Durum kolonu yok, türetiliyor — `access_until > trial_ends_at` ise abone,
değilse deneme; `access_until` geçmişse erişim yok.

Tablo `businesses`'tan ayrı, çünkü oradaki UPDATE politikası kolon ayrımı
yapmıyor: `access_until` orada olsaydı her owner kendi süresini PostgREST
üzerinden uzatabilirdi. Ayrı tabloda `authenticated` rolüne yalnızca SELECT
verildi; yazma `admin_extend_access()` ile ve o da çağıranın
`platform_admins` listesinde olmasını şart koşuyor.

Süre dolunca `requireSession()` kullanıcıyı `/abonelik`'e yönlendiriyor.
**Bu bir arayüz kilidi:** kullanıcının tokenı RLS tarafında hâlâ geçerli,
doğrudan PostgREST'e istek atan biri yazmaya devam edebilir. Gerçek kilit için
abonelik kontrolünün yazma politikalarına girmesi gerekir.

Ödeme havale ile alınıyor ve elle onaylanıyor: `/yonetim` ekranından gün
ekleniyor. `reference_code` havale açıklamasına yazılıyor — gelen ödemeyi
işletmeye bağlayan tek bilgi o.

**Tek paket, yalnızca yıllık** (`src/lib/subscription.ts`). Aylık seçenek yok:
ödeme elle onaylandığı için aylıkta bir müşteri için yılda on iki kez yazışmak
gerekirdi; yıllık peşin ayrıca bırakma oranını düşürüyor. Kademe de yok:
her yeni özellikte "bu hangi pakette" sorusunu, yükseltme yolunu ve limit
denetimini beraberinde getiriyor; bunun karşılığı ancak çok müşteride çıkar.
Salon sayısına göre de fiyatlanmıyor — ödeme elle onaylandığı için dönem
ortasında salon eklenince tutarın değişmesi her seferinde yazışma demekti.
Bu modül ürüne özel hiçbir şey içermiyor; başka ürünlere taşınabilsin diye
sade tutuldu. Salon sayısı yine `/yonetim` listesinde görünüyor — büyüyen
müşteriyi (Kurumsal adayını) fark etmek için.

### Para
Tüm parasal alanlar `numeric(12,2)`. Arayüzde toplama işlemleri kuruş cinsinden
tamsayı üzerinden yapılır (`sumMoney`), float birikimi oluşmaz. Gösterim
`Intl.NumberFormat("tr-TR")` ile: `₺120.000`.

---

## Dizin yapısı

```
src/
  app/
    (auth)/          giris, kayit + auth server action'ları
    (app)/           korumalı panel — her modül kendi actions.ts'i ile
      panel/         Dashboard
      takvim/        react-big-calendar
      rezervasyonlar/[id]  detay + tahsilat + gider + kârlılık
      musteriler/[id]
      gelirler/ giderler/ raporlar/ paketler/ salonlar/ ayarlar/
    isletme-kur/     e-posta doğrulaması sonrası işletme kurulumu
  components/
    ui/              shadcn/ui primitifleri
    layout/          Sidebar, PageHeader
    shared/          DataTable, FormDialog, Money, DatePicker, VoidDialog…
    charts/          recharts tabanlı grafikler
  lib/
    supabase/        client / server / admin / session
    schemas.ts       zod şemaları (istemci ve sunucu ortak)
    queries.ts       sunucu tarafı veri birleştirme
    format.ts        TR para, tarih, telefon biçimlendirme
supabase/
  migrations/        sıralı SQL dosyaları
  tests/             PGlite üzerinde şema + RLS testleri
```

Sunucu eylemleri (`actions.ts`) her zaman aynı deseni izler:
`requireSession()` → zod ile doğrula → Supabase → `revalidatePath()` →
`ActionResult` döndür. Hatalar `toTurkishError()` ile kullanıcı diline çevrilir.

---

## Bilinen sınırlar

- **Listeleme sunucu tarafında sayfalanmıyor.** Rezervasyonlar tek seferde
  çekilip (üst sınır 5.000 kayıt) istemcide filtreleniyor/sayfalanıyor. Yılda
  ~200 organizasyon yapan bir salon için yıllarca yeterli. Sınıra dayanıldığında
  liste ve takvimde uyarı çıkar (sessiz kırpma yok); o noktada
  `getReservationRows` sunucu tarafı sayfalamaya geçirilmeli.
- **Personel daveti** `SUPABASE_SERVICE_ROLE_KEY` gerektirir; anahtar tanımlı
  değilse arayüz açık bir hata mesajı gösterir.
- **Abonelik kilidi arayüz seviyesinde.** Süresi dolan kullanıcı panele
  giremiyor ama tokenı RLS tarafında geçerli kalıyor; doğrudan API isteğiyle
  yazma mümkün. Kapatmak için `subscriptions` kontrolünün yazma politikalarına
  eklenmesi gerekir.
- Sözleşme/teklif PDF çıktısı, SMS hatırlatma ve e-fatura entegrasyonu MVP
  kapsamı dışında bırakıldı.

## Canlı ortama alma

Sıra önemli: veritabanı önce, uygulama sonra. Aksi halde uygulama var olmayan
tablolara sorgu atar.

### 1. Veritabanı

Supabase → SQL Editor'de `supabase/migrations/` altındaki dosyaları **sırayla**
çalıştırın. Daha önce çalıştırdıklarınızı atlayın; migration'lar idempotent
değildir, ikinci kez çalıştırmak hata verir.

Doğrulama:

```sql
select table_name from information_schema.tables
where table_schema = 'public' order by table_name;
```

`leads`, `quotes`, `venue_holds`, `contracts` görünüyorsa şema güncel.

### 2. Ortam değişkenleri

Barındırma sağlayıcısında (Vercel → Settings → Environment Variables) ilk dört
değişken zorunlu:

| Değişken | Nereden |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Aynı sayfa |
| `SUPABASE_SERVICE_ROLE_KEY` | Aynı sayfa · **yalnızca sunucu**, asla `NEXT_PUBLIC_` yapmayın |
| `NEXT_PUBLIC_APP_URL` | Canlı adres, ör. `https://davetpro.com` |
| `BILLING_IBAN` | Abonelik sayfasında gösterilecek IBAN · opsiyonel |
| `BILLING_ACCOUNT_NAME` | Havale alıcısının adı · opsiyonel |
| `BILLING_BANK` | Banka adı · opsiyonel |

`BILLING_*` tanımsızsa abonelik sayfası boş bir kutu göstermek yerine yalnızca
WhatsApp yönlendirmesi çıkarır. `NEXT_PUBLIC_` **değildir**: yalnızca sunucuda
okunur.

`NEXT_PUBLIC_APP_URL` üretimde zorunludur: personel daveti ve şifre sıfırlama
e-postalarındaki bağlantılar bu adresten üretilir. Tanımsızsa uygulama açık bir
hata verir — sessizce localhost'a düşmez.

### 3. Supabase Auth ayarları

Supabase → Authentication → URL Configuration:

- **Site URL**: canlı adres
- **Redirect URLs**: `https://<alan-adı>/auth/callback` ve `https://<alan-adı>/giris`

Bu adımı atlarsanız davet ve şifre sıfırlama bağlantıları çalışmaz.

### 4. Dağıtım

Depoyu GitHub'a gönderip Vercel'de içe aktarmak yeterli; ek yapılandırma
gerekmez. Vercel projeyi Next.js olarak tanır, `npm run build` çalıştırır.

Dağıtımdan önce yerelde son kontrol:

```bash
npm run test && npm run test:audit && npm run build
```

### 5. Yayın sonrası duman testi

1. Kayıt olup yeni bir işletme kurun.
2. Salon ve paket ekleyin.
3. Talep oluşturun, teklif verin, tarihi opsiyona alın.
4. Talebi rezervasyona dönüştürüp kapora girin — tahsilatın tek kayıt olduğunu doğrulayın.
5. Sözleşme oluşturup PDF çıktısını alın.
6. Ayarlar → Kullanıcılar'dan kendinize bir davet gönderin; gelen e-postadaki
   bağlantının canlı adrese gittiğini kontrol edin.
