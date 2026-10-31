import { ContractSample } from "@/components/marketing/contract-sample";
import { sayfaMetadata } from "@/lib/seo";
import { SOZLESME_SABLONU } from "@/lib/sozlesme-ornegi";

export const metadata = sayfaMetadata({
  baslik: "Düğün Salonu Sözleşmesi Örneği (Yazdırılabilir)",
  aciklama:
    "Düğün salonu sözleşmesi örneği: kapora, kalan ödeme, iptal, tarih değişikliği ve zarar maddeleriyle 16 madde. Ücretsiz okuyun, yazdırın ve doldurun.",
  yol: "/dugun-salonu-sozlesme-ornegi",
  paylasimBasligi: "Düğün salonu sözleşmesi örneği · DavetPro",
});

export default function Page() {
  return (
    <ContractSample
      sablon={SOZLESME_SABLONU.salon}
      ustBaslik="Sözleşme örneği"
      baslik="Düğün salonu sözleşmesi örneği"
      giris="Düğün, nişan, kına ve kurumsal organizasyonlar için 16 maddelik organizasyon hizmet sözleşmesi. Köşeli parantezli alanları kendi bilgilerinizle doldurun; iptal ve kapora iadesi maddesini mutlaka kendi koşullarınıza göre yazın."
      yol="/dugun-salonu-sozlesme-ornegi"
      yolAdi="Düğün salonu sözleşmesi örneği"
      ipuclari={[
        {
          baslik: "İptal ve kapora iadesi",
          metin:
            "Örnekte bu madde bilerek açık bırakıldı: koşulu siz belirleyeceksiniz. Tarihe kalan süreye göre kademe yazın (ör. 6 aydan önce iptalde kaporanın ne kadarı iade edilir) ve rakamla yazın; \"makul süre\" gibi ifadeler tartışma çıkarır.",
        },
        {
          baslik: "Kalan ödemenin tarihi",
          metin:
            "Kalan tutarın hangi tarihe kadar ödeneceği yazılmazsa ödeme organizasyon gecesine kayar. Tarihi gün olarak yazın ve ödenmezse ne olacağını (rezervasyonun iptali gibi) aynı maddede belirtin.",
        },
        {
          baslik: "Saat aralığı ve uzama",
          metin:
            "Başlangıç ve bitiş saati net olsun. Süre aşılırsa saatlik ek ücretin tutarını yazmak, gece yarısı kapıda pazarlık yapmaktan iyidir.",
        },
        {
          baslik: "Pakete dahil olanlar",
          metin:
            "Menü, pasta, içecek, DJ, süsleme… Pakete dahil her kalemi tek tek yazın. Dahil olmayanlar ve ek hizmetler ayrı satırda, tutarıyla yer almalı.",
        },
        {
          baslik: "Davetli sayısı",
          metin:
            "Kişi başı fiyat uyguluyorsanız tahmini sayının yanında kesin sayının ne zaman bildirileceğini ve fazla gelen davetlinin nasıl ücretlendirileceğini yazın.",
        },
        {
          baslik: "İki nüsha, iki imza",
          metin:
            "Sözleşme numarası ve tarih her iki nüshada aynı olmalı. Kapora makbuzunda sözleşme numarasını anmak, hangi ödemenin hangi işe ait olduğunu sonradan tartışmasız kılar.",
        },
      ]}
      sorular={[
        {
          soru: "Düğün salonu sözleşmesinde hangi maddeler olmalı?",
          cevap:
            "En az şunlar: taraflar, organizasyon tarihi ve saat aralığı, salon ve davetli sayısı, paket ve dahil hizmetler, toplam bedel ve indirim, alınan kapora, kalan ödeme ve tarihi, iptal ve kapora iadesi, tarih değişikliği, mücbir sebepler, mekâna verilen zararlar ve yetkili merci.",
        },
        {
          soru: "Kapora iadesi sözleşmede nasıl yazılmalı?",
          cevap:
            "Organizasyon tarihine kalan süreye göre kademeli yazmak yaygın: örneğin belirli bir süreden önce iptalde kaporanın bir kısmının iadesi, sonrasında iadesiz. Oranları ve süreleri rakamla yazın; boş bırakılan iade maddesi en sık anlaşmazlık sebebidir.",
        },
        {
          soru: "Bu örneği olduğu gibi kullanabilir miyim?",
          cevap:
            "Genel bir örnek olarak kullanabilirsiniz; ancak iptal, iade ve yetkili merci maddelerini kendi işletmenize göre doldurmanız gerekir. Hukuki danışmanlık yerine geçmez.",
        },
        {
          soru: "Sözleşmeyi her müşteri için tekrar doldurmak zorunda mıyım?",
          cevap:
            "DavetPro'da hayır: rezervasyonu girdiğinizde aynı metin müşteri, tarih, salon, paket, kapora ve kalan ödeme bilgileriyle dolu hazırlanır, numarası kendiliğinden verilir. Yazdırabilir ya da müşteriye bağlantıyla gönderebilirsiniz.",
        },
      ]}
      ilgili={[
        { href: "/blog/dugun-salonu-sozlesmesi", ad: "Düğün salonu sözleşmesinde neler bulunmalı?" },
        { href: "/blog/kapora-ne-kadar-alinmali", ad: "Kapora ne kadar alınmalı, sözleşmede nasıl yazılır?" },
        { href: "/fotografci-sozlesme-ornegi", ad: "Fotoğrafçı sözleşmesi örneği" },
        { href: "/", ad: "Düğün salonu programı DavetPro" },
      ]}
    />
  );
}
