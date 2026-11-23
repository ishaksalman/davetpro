# DavetPro mobil — mağaza kayıt rehberi

Bu dosya App Store Connect ve Google Play Console'a girilecek metinleri ve form cevaplarını toplar.
**Taslaktır:** hukuki ve ticari ifadeleri yayınlamadan önce gözden geçirin.

## Temel bilgiler
| Alan | Değer |
|---|---|
| Uygulama adı | DavetPro |
| Paket / Bundle ID | `com.davetpro.mobile` (iOS ve Android aynı) |
| Sürüm | 1.0.0 (build numarasını EAS otomatik artırır) |
| Kategori | İş (Business) · ikincil: Verimlilik |
| Yaş sınırı | 4+ / Herkes (içerik yok; iş aracı) |
| Dil | Türkçe |
| Gizlilik politikası | https://www.davetpro.com/gizlilik |
| Kullanım koşulları | https://www.davetpro.com/kullanim-kosullari |
| Destek e-postası | info@davetpro.com |
| Pazarlama sitesi | https://www.davetpro.com |

## Mağaza metinleri

**Alt başlık (30 karakter, iOS):** Salon, çekim, organizasyon takibi

**Kısa açıklama (80 karakter, Google Play):**
Düğün salonu, fotoğrafçı ve organizasyon işletmeleri için rezervasyon ve kasa takibi.

**Anahtar kelimeler (100 karakter, iOS):**
`düğün,salon,rezervasyon,fotoğrafçı,organizasyon,takvim,kapora,tahsilat,gelir gider,müşteri,teklif`

**Tam açıklama:**

> DavetPro, düğün salonu, fotoğrafçı ve organizasyon işletmelerinin işini cebinden yönetmesi için yapıldı.
>
> • Takvim ve rezervasyon: ay, hafta ve liste görünümü. Aynı salona aynı saate ikinci iş alınmasını önleyen müsaitlik kontrolü.
> • Tahsilat ve kapora: her rezervasyonda alınan, kalan ve vadesi gelen ödemeler. Geciken tahsilatlar öne çıkar.
> • Gelir–gider: nakit akışı ve kârlılık, son 6 aylık grafik, kategorili giderler.
> • Müşteriler ve talepler: telefon görüşmelerinden teklife, opsiyona ve rezervasyona kadar tüm süreç.
> • Fotoğrafçılar için teslimat takibi: çekim, seçim, düzenleme, baskı ve teslim adımları.
> • Ekip ve yetkiler: personelin neyi göreceğini sen belirlersin; finans bilgisi yetkisiz kullanıcıya hiç gösterilmez.
> • Açık ve koyu tema.
>
> Not: Bu uygulama DavetPro hesabı gerektirir. Abonelik ve ödeme işlemleri uygulama içinde yapılmaz.

**Sürüm notları (ilk sürüm):** İlk sürüm: takvim, rezervasyon, tahsilat, gelir–gider, müşteriler ve talepler.

## İnceleme notları (Apple "App Review Information" / Google "App access")
İnceleme ekibi giriş ister. **Gerçek müşteri verisi olmayan bir demo hesap** açıp aşağıya yazın:

- Kullanıcı adı: `demo@…` (oluşturulacak)
- Şifre: (oluşturulacak)
- Açıklama: "Hesap bir salon işletmesine bağlıdır ve örnek rezervasyonlar içerir. Tüm özellikler giriş yaptıktan sonra Anasayfa, Takvim, Rezervasyon ve Daha sekmelerinden görülebilir. Hesap silme: Daha → Hesabım → Hesabı sil. Abonelik ve ödeme işlemleri uygulama dışında (web) yönetilir; uygulama içinde satın alma yoktur."

> Hesap silme ve ödeme bilgisi, Apple'ın ilk reddinde en sık istenen iki noktadır; notta açık yazmak süreci kısaltır.

## Apple — App Privacy (veri toplama)
| Veri türü | Toplanıyor mu | Kullanıcıya bağlı | Takip (tracking) | Amaç |
|---|---|---|---|---|
| E-posta adresi | Evet | Evet | Hayır | Uygulama işlevselliği, hesap |
| Ad | Evet | Evet | Hayır | Uygulama işlevselliği |
| Telefon numarası (işletmenin müşteri kayıtları) | Evet | Evet | Hayır | Uygulama işlevselliği |
| Finansal bilgi (işletmenin tahsilat/gider kayıtları) | Evet | Evet | Hayır | Uygulama işlevselliği |
| Kullanıcı içeriği (notlar, sözleşmeler) | Evet | Evet | Hayır | Uygulama işlevselliği |
| Kimlikler (kullanıcı ID) | Evet | Evet | Hayır | Uygulama işlevselliği |

Reklam, analiz veya izleme SDK'sı kullanılmıyor → **"Veri izleme yok"**. Şifreleme: uygulama yalnızca standart HTTPS kullanır (`ITSAppUsesNonExemptEncryption = false` ayarlı).

## Google Play — Veri güvenliği
- Veri paylaşımı: **Hayır** (üçüncü taraflarla satış/reklam amaçlı paylaşım yok; altyapı sağlayıcı "hizmet sağlayıcı" sayılır).
- Toplanan: Kişisel bilgiler (ad, e-posta, telefon), Finansal bilgiler (kullanıcı tarafından girilen kayıtlar), Uygulama içi içerik.
- Aktarımda şifreleme: **Evet**. Kullanıcı veri silme talebi: **Evet — uygulama içinden (Hesabı sil)** ve web adresi.
- Veri silme URL'si (Play'in istediği): https://www.davetpro.com/gizlilik (bölüm "Hesabınızı ve verilerinizi silme").
- İçerik derecelendirme anketi: şiddet/cinsellik/kumar yok → "Herkes".
- Hedef kitle: 18+ (işletme sahipleri).

## Ekran görüntüleri
Her iki mağaza için gerçek cihaz/simülatörden, **demo hesapla** alınmalı (gerçek müşteri adı görünmesin):
1. Anasayfa (hero + bu ay/doluluk kartları)
2. Takvim (ay görünümü, dolu günler)
3. Rezervasyon detayı (ödeme özeti)
4. Rezervasyonlar listesi
5. Finans (nakit akışı grafiği)
6. Koyu tema Anasayfa

Boyutlar: iPhone 6,9" (1320×2868) zorunlu; iPad desteklenmiyor (`supportsTablet: false`). Android: en az 2 telefon ekran görüntüsü, 16:9–9:16.

## Gönderim öncesi kontrol listesi
- [ ] `0048_hesap_silme.sql` canlı veritabanında uygulandı, test hesabıyla silme denendi
- [ ] Web yayında: `/gizlilik` ve `/kullanim-kosullari` açılıyor (şirket ünvanı/adres eklendi)
- [ ] Demo hesap hazır, inceleme notuna yazıldı
- [ ] Gerçek cihazda test: kayıt → e-posta doğrulama bağlantısı (`davetpro://`) → işletme kurulumu → rezervasyon → tahsilat
- [ ] iOS: Apple Developer hesabı, `eas build -p ios --profile production`, `eas submit`
- [ ] Android: Play Console hesabı, ilk yükleme **elle** (Play ilk AAB'yi kendi ister), sonra `eas submit`
