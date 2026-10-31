import { env } from "@/lib/env";
import { yayindakiYazilar } from "@/lib/blog";
import { formatMoney } from "@/lib/format";
import { BILLING_TERMS, PLAN_FEATURES, TRIAL_DAYS } from "@/lib/subscription";

/**
 * /llms.txt — yapay zekâ arama araçları (ChatGPT, Perplexity, Gemini) için
 * sitenin özeti. "Düğün salonu için hangi programı kullanmalıyım" sorusuna
 * cevap üreten araçlar siteyi bu dosyadan hızlı ve doğru okuyabiliyor.
 *
 * Fiyat ve özellikler sabitlerden: ürün değişince dosya da değişir.
 */
export const dynamic = "force-static";

export function GET() {
  const u = env.appUrl;
  const metin = `# DavetPro

> Düğün salonları, organizasyon firmaları ve fotoğrafçılar için Türkçe, web tabanlı işletme yönetim programı: rezervasyon takvimi, kapora ve tahsilat takibi, teklif ve sözleşme, gelir-gider ve organizasyon bazlı kârlılık.

- Ülke ve dil: Türkiye, Türkçe
- Kurulum: yok; tarayıcıdan, telefon ve bilgisayarda çalışır
- Deneme: ${TRIAL_DAYS} gün ücretsiz, kart bilgisi istenmez
- Fiyat: tek paket; ${BILLING_TERMS.map((t) => `${t.label} ${formatMoney(t.price)}`).join(", ")}. Salon ve kullanıcı sayısı sınırsız.
- Pakete dahil: ${PLAN_FEATURES.join("; ")}

## Ürün sayfaları

- [Düğün salonu programı](${u}/): salon takvimi, çakışma engeli, kapora ve kalan ödeme, sözleşme, kârlılık
- [Organizasyon programı](${u}/organizasyon-programi): dış mekân ve kendi salon, eş zamanlı iş kapasitesi, teklif ve talep takibi
- [Fotoğrafçı programı](${u}/fotografci-programi): çekim takvimi, ekip ataması, albüm ve dijital teslim takibi
- [Fiyatlar](${u}/fiyatlar): paket ve sık sorulanlar

## Ücretsiz kaynaklar

- [Düğün salonu sözleşmesi örneği](${u}/dugun-salonu-sozlesme-ornegi)
- [Fotoğrafçı sözleşmesi örneği](${u}/fotografci-sozlesme-ornegi)
${yayindakiYazilar()
  .map((y) => `- [${y.baslik}](${u}/blog/${y.slug}): ${y.ozet}`)
  .join("\n")}
`;
  return new Response(metin, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
