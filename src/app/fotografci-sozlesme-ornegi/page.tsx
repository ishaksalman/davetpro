import { ContractSample } from "@/components/marketing/contract-sample";
import { sayfaMetadata } from "@/lib/seo";
import { FOTOGRAF_ETIKETLERI, SOZLESME_SABLONU } from "@/lib/sozlesme-ornegi";

export const metadata = sayfaMetadata({
  baslik: "Fotoğrafçı Sözleşmesi Örneği · Telif ve Teslim Maddeli",
  aciklama:
    "Düğün fotoğrafçısı ve video için sözleşme örneği: teslim süresi, kapora, telif ve kullanım hakkı, portfolyo izni, ham dosya saklama. Ücretsiz okuyun, yazdırın.",
  yol: "/fotografci-sozlesme-ornegi",
  paylasimBasligi: "Fotoğrafçı sözleşmesi örneği · DavetPro",
});

export default function Page() {
  return (
    <ContractSample
      sablon={SOZLESME_SABLONU.fotografci}
      etiketler={FOTOGRAF_ETIKETLERI}
      ustBaslik="Sözleşme örneği"
      baslik="Fotoğrafçı sözleşmesi örneği"
      giris="Düğün, nişan ve dış çekim için 17 maddelik fotoğraf ve video hizmet sözleşmesi. Teslim süresi, telif ve kullanım hakları, portfolyo izni ve ham dosya saklama maddeleri dahil."
      yol="/fotografci-sozlesme-ornegi"
      yolAdi="Fotoğrafçı sözleşmesi örneği"
      ipuclari={[
        {
          baslik: "Teslim süresi rakamla",
          metin:
            "\"En kısa sürede\" yazmayın. Dijital teslim için gün sayısını, albüm için baskı sürecinin ne zaman başladığını (ör. müşteri seçimi bildirdikten sonra) açıkça yazın.",
        },
        {
          baslik: "Telif ile kullanım hakkı ayrı",
          metin:
            "Eser sahipliği fotoğrafçıda kalır; müşteriye verilen kişisel kullanım hakkıdır. Ticari kullanım ve sosyal medyada etiketleme gibi konuları ayrıca belirtin.",
        },
        {
          baslik: "Portfolyo izni ayrıca işaretlensin",
          metin:
            "Fotoğrafları kendi sayfanızda kullanmak istiyorsanız müşterinin onayını sözleşmede ayrı bir işaretle alın. Onay yoksa kullanmayın.",
        },
        {
          baslik: "Ham dosya ve saklama süresi",
          metin:
            "Ham dosyaların verilip verilmeyeceğini ve teslimden sonra kaç ay saklanacağını yazın. Süre sonunda silindiği bilgisi, yıllar sonra gelen \"dosyalar sizde var mı\" sorusunun cevabıdır.",
        },
        {
          baslik: "Kalan ödeme ve teslim",
          metin:
            "Kalan ödeme tamamlanmadan nihai teslimin yapılmayabileceği maddesi örnekte var. Kalan tutarın tarihini de yazın.",
        },
        {
          baslik: "Ekip ve mücbir sebep",
          metin:
            "Hastalık gibi durumlarda yerinize ekip görevlendirme seçeneğini önceden yazmak, son dakika krizini sözleşmeye uygun bir çözüme çevirir.",
        },
      ]}
      sorular={[
        {
          soru: "Fotoğrafçı sözleşmesinde hangi maddeler olmalı?",
          cevap:
            "Taraflar, çekim tarihi ve saatleri, paket ve ek hizmetler, toplam bedel, kapora ve kalan ödeme, teslim süresi ve biçimi, telif ve kullanım hakları, iptal ve tarih değişikliği, mücbir sebepler, ham dosya saklama ve yetkili merci.",
        },
        {
          soru: "Düğün fotoğraflarının telif hakkı kime ait?",
          cevap:
            "Eser sahipliği kural olarak fotoğrafı çekene aittir; müşteriye sözleşmeyle kullanım hakkı verilir. Örnekteki madde müşteriye kişisel kullanım hakkı tanır, ticari kullanımı yazılı izne bağlar.",
        },
        {
          soru: "Fotoğrafçı ham dosyaları vermek zorunda mı?",
          cevap:
            "Sözleşmede yazılı değilse genellikle hayır. Ham dosya verilecekse bu, pakete dahil hizmetlerde ya da ek hizmet olarak açıkça belirtilmelidir.",
        },
        {
          soru: "Sözleşmeyi her çekimde yeniden mi dolduracağım?",
          cevap:
            "DavetPro'da hayır: çekimi girdiğinizde bu metin müşteri, tarih, paket, ek hizmetler, kapora ve kalan ödeme bilgileriyle dolu hazırlanır. Yazdırabilir ya da müşteriye bağlantıyla gönderebilirsiniz.",
        },
      ]}
      ilgili={[
        { href: "/blog/fotografci-sozlesmesi-telif", ad: "Fotoğrafçı sözleşmesinde telif ve kullanım hakkı" },
        { href: "/fotografci-programi", ad: "Fotoğrafçı programı: çekim ve teslim takibi" },
        { href: "/dugun-salonu-sozlesme-ornegi", ad: "Düğün salonu sözleşmesi örneği" },
        { href: "/blog/kapora-ne-kadar-alinmali", ad: "Kapora ne kadar alınmalı?" },
      ]}
    />
  );
}
