# İçerik ve SEO planı

> Marka dili ve ürün iddiaları için önce `marka-brief.md` oku. Buradaki her
> yazı o dosyadaki **"asla iddia etme"** listesine uymak zorunda.

## Durum

Dizine giren üç sayfa: `/`, `/fiyatlar`, `/fotografci-programi`.
Search Console'da www'li mülk doğrulandı, site haritası gönderildi.

Yeni alan adı, otorite düşük. "Düğün salonu programı" gibi ana terimlerde
yerleşik rakiplerle (Genix, SalonNet) baş edilemez. Strateji: **uzun kuyruk +
yüksek niyet**.

## Sıra

1. ~~Fotoğrafçı iniş sayfası~~ — tamam
2. Blog altyapısı
3. 1. dalga yazılar
4. Sonraki dalgalar

## Blog altyapısı (yazılardan önce)

- `/blog` ve `/blog/[slug]`, MDX ile
- Yazı başına `metadata` (başlık, açıklama, OG görseli) + `Article` yapısal verisi
- **`sitemap.ts` yazıları otomatik toplasın.** Şu an yollar elle yazılı; her
  yazıda düzenlemek unutulur. robots.txt'te tam bu yüzden üç yol kaçmıştı.
- Yeni genel sayfa eklerken üç yer güncelleniyor: `sitemap.ts`,
  `session.ts → OPEN_ROUTES`, `tests/robots.test.mts → ACIK`. Sonuncusu
  unutulanı zaten kırmızıya düşürüyor.
- Yazı sonu CTA bileşeni

## 1. dalga — Şablon sayfaları

En yüksek dönüşüm. Ürün bunları zaten üretiyor, yani özgün ve dürüst içerik.

| Yazı | Bağlandığı özellik |
|---|---|
| Düğün salonu sözleşme örneği | Sözleşme şablonu; "her rezervasyonda otomatik üretilsin mi?" |
| Organizasyon fiyat teklifi örneği | Teklif modülü |
| Fotoğrafçı hizmet sözleşmesi örneği | Telif ve kullanım hakları maddesi — rakiplerde yok |

## 2. dalga — Problem içerikleri

| Yazı | Bağlandığı özellik |
|---|---|
| Düğün salonunda kârlılık nasıl hesaplanır | Organizasyon bazlı kâr, "ciro ≠ kâr" |
| Kapora ne kadar alınmalı, sözleşmede nasıl yazılır | Kapora ve tahsilat takibi |
| Düğün salonu gider kalemleri listesi | Gider kategorileri |
| Aynı güne iki düğün: çakışma nasıl önlenir | Veritabanı düzeyinde engel |

## 3. dalga — Ticari niyet

- Excel ile düğün salonu takibi nerede tıkanıyor
- Düğün salonu programı seçerken bakılacak 7 şey (rakip ismi vermeden)

## 4. dalga — Fotoğrafçı serisi

- Çekimden teslime: stüdyo iş akışı
- Düğün fotoğrafçısı fiyat listesi nasıl kurulur
- Albüm teslim süreci takibi

## Kurallar

- Uydurma istatistik yok. "Salonların %70'i" gibi cümleler kurulmaz.
- Her yazı bir ürün özelliğine bağlansın, ama yazı tek başına faydalı olsun.
- Yazılar birbirine iç bağlantı versin.
- Salon ve fotoğrafçı yazıları ilgili iniş sayfasına bağlansın.

## Açık konu

**Arama hacimleri doğrulanmadı.** Yukarıdaki konular ürün ve pazar mantığına
dayanıyor, veriye değil. Yazmadan önce bir anahtar kelime aracıyla kontrol
edilmeli; yoksa kimsenin aramadığı konuya emek gider.

## Ritim

Haftada 1 yazı. 3 ayda 12 yazı, ilk ölçülebilir sonuç 2–3 ay sonra.
