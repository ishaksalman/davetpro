# DavetPro Mobil

iOS + Android uygulaması (Expo SDK 58, React Native, Expo Router, TypeScript). Mevcut web
uygulamasıyla **aynı Supabase projesi, aynı kullanıcılar ve aynı veriler**: webde yapılan işlem
mobilde, mobilde yapılan işlem webde görünür. Platform yönetimi, blog ve pazarlama sayfaları
kapsam dışıdır.

## Çalıştırma

```bash
cd mobile
cp .env.example .env        # web .env.local'daki NEXT_PUBLIC_* değerlerinin EXPO_PUBLIC_* karşılığı
npm install --legacy-peer-deps
npx expo start --ios        # veya --android
npm run typecheck && npm test
```

`SUPABASE_SERVICE_ROLE_KEY` mobil uygulamaya **asla** konmaz; yalnızca anon anahtar kullanılır.

**Test ortamı:** geliştirme sırasında canlı müşteri verisi değiştirilmez. Gerçek bağlantıyla denemek için
ayrı bir test işletmesi (veya ayrı bir Supabase projesi) ve test kullanıcısı kullanın; yazma
işlemleri (rezervasyon, tahsilat, gider) gerçek veritabanına gider.

## Kapsam durumu

Giriş/oturum/bağlantılar, Anasayfa, Takvim, Rezervasyonlar (liste, detay, oluşturma/düzenleme), tahsilat/gider (iptal
dahil), Gelirler ve Giderler (dönem filtresi, özet, manuel gelir, iptal), Finans (nakit akışı + kârlılık), Müşteriler, Talepler ve teklifler (opsiyon, görüşme, takip, kayıp nedeni,
rezervasyona dönüştürme; teklif metin olarak paylaşılır), Teslimat (fotoğrafçı), Paketler, Salonlar/Mekânlar/Platolar,
Ekipler ve Ayarlar (işletme, kullanıcı rol/yetki, gider kategorileri, şifre).

Bilinçli olarak mobilde YOK: kayıt/silme işlemleri (paket, salon, ekip, müşteri, rezervasyon silinmez; pasife alınır ya da
iptal edilir), sözleşme oluşturma/şablon, Düğünce entegrasyonu.

## Yapı

```
mobile/
  src/app/            Expo Router rotaları ((auth), (app)/(tabs), rezervasyon/…)
  src/design/         Figma token'ları (açık + koyu), Manrope metin stilleri, tema
  src/ui/             Yeniden kullanılabilir bileşenler (Button, Inputs, List, Sheet, Feedback…)
  src/features/       Alan bileşenleri (ReservationCard, PaymentSummary, finans sayfaları…)
  src/lib/auth/       Oturum sağlayıcısı, e-posta bağlantısı (davet/sıfırlama) işleyici
  src/lib/data/       TanStack Query hook'ları (RLS ile doğrudan Supabase + RPC)
  src/lib/domain/     Saf iş mantığı (tutar girişi, rezervasyon yükü, durum, müsaitlik, takvim)
  __tests__/          Jest: para, yetki, tarih, rezervasyon akışı, oturum depolama, bağlantılar
```

### Web ile paylaşılan kod (kopyalamadan)

`metro.config.js` + `tsconfig.json`, web'deki `src/lib` içindeki **saf TypeScript** dosyalarını
`@/lib/*` takma adıyla doğrudan kullanır: `schemas` (zod, idempotent), `constants`, `format`
(`sumMoney`, para/telefon), `errors` (`toTurkishError`), `time` (Europe/Istanbul), `vertical`
(işletme türü sözlüğü), `stage`, `trend`, `subscription`, `database.types`. Next'e bağlı dosyalar
(`auth.ts`, `queries.ts`, `supabase/*`, sunucu eylemleri) paylaşılmaz; mobil karşılıkları `src/lib`
altındadır. Web `tsconfig.json`/`eslint.config.mjs` yalnızca `mobile` klasörünü dışlar.

## Güvenlik ve iş kuralları

- **Tenant izolasyonu ve finans yetkisi RLS'tedir.** İstemci kullanıcının JWT'siyle çalışır;
  `business_id` filtresi güvenlik mekanizması sayılmaz. Finans bilgisi olmayan kullanıcıda finans
  ekranları/sekmesi hiç çizilmez; veriyi zaten RLS vermez.
- **Token saklama:** `expo-secure-store` (iOS Keychain / Android Keystore), büyük oturum parçalanarak.
  Çıkışta ve kullanıcı değişiminde TanStack Query önbelleği temizlenir.
- **Para:** `numeric(12,2)`; toplamalar kuruş tamsayısı (`sumMoney`, `pricingTotals`); tutar girişi
  `number` üretir, ham metin şemaya verilmez (bkz. `money-input.ts`).
- **Tahsilat/gider:** silme ve tutar değiştirme yok; iptal `voided_at` + `void_reason`. Yazma işlemleri
  asla otomatik tekrarlanmaz, çift gönderim ref kilidiyle engellenir, hatada girdiler korunur,
  çevrimdışıyken finansal kayıt eklenmez.
- **Çakışma:** `venue_availability` RPC yalnızca erken uyarı; nihai otorite veritabanı kısıtı/trigger'ı.
- **Sorgu hatası boş veri değildir:** hata → `ErrorState`, boş → `EmptyState`, yükleniyor → iskelet.

## Sunucuda kalması gerekenler / backend önerileri

| Konu | Durum | Öneri |
|---|---|---|
| Personel daveti, davet iptali | service_role gerektirir → **sunucu uç noktası**: web `src/app/api/mobile/team/route.ts` (Bearer JWT, yönetici doğrulaması, `src/lib/team-invites.ts`). Mobil: Ayarlar → Kullanıcılar → Davet et. **Canlıya alınması gerekir**; mobilde `EXPO_PUBLIC_APP_URL` o adresi göstermeli | —
| Teklif / sözleşme çıktısı | `(print)` rotaları çerez ister | Sözleşme için mevcut `/s/<share_token>` ile paylaşım; teklif için jetonlu açık görünüm eklenmeli |
| **Abonelik kilidi** | Yalnızca web `requireSession` (arayüz); RLS zorlamıyor. Mobilde yönlendirme **güvenli kilit değildir** | `subscriptions.access_until` kontrolünü yazma politikalarına / `can_write()` yardımcısına ekleyin (yeni migration) |
| Universal / App Links | Mevcut e-posta bağlantıları web adresine iner | Web'e `apple-app-site-association` ve `assetlinks.json` ekleyin; Supabase Auth → Redirect URLs'e `davetpro://**` ekleyin |
| Bildirim (push) | Kapsam dışı | Sonraki aşama |

Ödeme altyapısı eklenmemiştir. Süresi dolan hesap web ile aynı şekilde engel ekranına yönlendirilir.

## Cihazda doğrulanması gerekenler

Hermes'te `Intl` (tr-TR para, Europe/Istanbul saat dilimi), klavye davranışı (`decimal-pad` ondalık
ayracı), güvenli alan/Dynamic Island, Android geri tuşu ve gerçek e-posta bağlantılarının uygulamayı
açması, TestFlight/Play iç test dağıtımı. Yerel testler bunları kapsamaz.
