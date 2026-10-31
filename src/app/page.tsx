import { Audiences } from "@/components/marketing/audiences";
import { Bento } from "@/components/marketing/bento";
import { CtaBand } from "@/components/marketing/cta-band";
import { Faq } from "@/components/marketing/faq";
import { FeatureCards } from "@/components/marketing/feature-cards";
import { FeatureSections } from "@/components/marketing/feature-sections";
import { Hero } from "@/components/marketing/hero";
import { Pricing } from "@/components/marketing/pricing";
import { SiteFooter } from "@/components/marketing/site-footer";
import { WhatsAppFloat } from "@/components/marketing/whatsapp-float";
import { SiteHeader } from "@/components/marketing/site-header";
import { JsonLd } from "@/components/seo/json-ld";
import { formatMoney } from "@/lib/format";
import { kurulusVerisi, sayfaMetadata, yazilimVerisi, type Soru } from "@/lib/seo";
import { ENTRY_TERM, TRIAL_DAYS } from "@/lib/subscription";

/*
 * Oturum kontrolü sayfada DEĞİL proxy'de (lib/supabase/session.ts). Sayfa
 * çerez okumayınca derlemede statik üretiliyor ve CDN'den sunuluyor; önceden
 * her ziyarette sunucuda yeniden çiziliyordu (ilk bayt ~1-2 sn).
 */
export const metadata = sayfaMetadata({
  baslik: "Düğün Salonu Programı",
  mutlakBaslik: "Düğün Salonu Programı · Rezervasyon ve Kapora Takibi | DavetPro",
  aciklama:
    "Düğün salonları, organizasyon firmaları ve fotoğrafçılar için rezervasyon takvimi, kapora ve tahsilat takibi, sözleşme ve kârlılık raporu. 30 gün ücretsiz.",
  yol: "/",
});

/** Sayfada görünen sorular — FAQPage verisi de bunlardan üretiliyor. */
const SORULAR: Soru[] = [
  {
    soru: "Düğün salonu programı ne işe yarar?",
    cevap:
      "Rezervasyon defterinin, kapora makbuzlarının ve gelir-gider Excel'inin yerini alır. Hangi tarihin dolu olduğu, kimden ne kadar kapora alındığı, kalan ödemenin ne zaman geleceği ve her organizasyonun ne kazandırdığı tek ekranda görünür.",
  },
  {
    soru: "Aynı salona aynı saatte iki rezervasyon girilebilir mi?",
    cevap:
      "Hayır. Çakışma veritabanı düzeyinde engellenir: aynı salona çakışan saatte kayıt açılmaz, arka arkaya organizasyonlar arasında da en az 1 saat boşluk aranır. Birden çok salonunuz varsa hepsi aynı takvimde ayrı ayrı izlenir.",
  },
  {
    soru: "Kapora ve kalan ödeme nasıl takip ediliyor?",
    cevap:
      "Kaporayı ve kalan ödeme tarihini girersiniz; her tahsilatta kalan tutar kendiliğinden güncellenir. Vadesi yaklaşan ödemeler panelde listelenir. Girilen tahsilat silinemez, iptal edilirse gerekçesiyle iz bırakır.",
  },
  {
    soru: "Sözleşme ve teklif çıkarabiliyor muyum?",
    cevap:
      "Evet. Rezervasyon bilgileriyle dolu sözleşme ve fiyat teklifi tek tıkla yazdırılır ya da PDF olarak kaydedilir. Sözleşmeyi müşteriye WhatsApp'tan bağlantı olarak da gönderebilirsiniz; müşteri giriş yapmadan açıp okur.",
  },
  {
    soru: "Personelim tutarları görmeden takvimi kullanabilir mi?",
    cevap:
      "Evet. Fiyat ve tahsilat bilgisi rezervasyondan ayrı tutulur. Finans yetkisi verilmeyen kullanıcı takvimi, müşteriyi ve organizasyon ayrıntısını görür, tutarları görmez.",
  },
  {
    soru: "Telefondan kullanılabiliyor mu, kurulum gerekiyor mu?",
    cevap:
      "Kurulum yok; tarayıcıdan açılıyor. Telefon, tablet ve bilgisayarda aynı hesapla çalışır. Kayıt birkaç dakika sürer, salonlarınızı ve paketlerinizi tanımlayıp ilk rezervasyonu hemen girebilirsiniz.",
  },
  {
    soru: "Fiyatı ne kadar, deneme süresi var mı?",
    cevap: `${TRIAL_DAYS} gün ücretsiz deneyebilirsiniz; kart bilgisi istenmez. Sonrasında tek paket var: ${ENTRY_TERM.label} ${formatMoney(ENTRY_TERM.price)}. Salon ve kullanıcı sayısına göre fiyat değişmez.`,
  },
];

export default function LandingPage() {
  return (
    // mk-scope: tanıtım sayfası sabit açık paletle çalışır, koyu tema tercihi
    // burada uygulanmaz (bkz. globals.css → "Tanıtım sayfası").
    <div className="mk-scope min-h-svh">
      <JsonLd data={[...kurulusVerisi(), yazilimVerisi()]} />
      <SiteHeader />
      <main>
        <Hero />
        <FeatureCards />
        <FeatureSections />
        <Audiences />
        <Bento />
        <Pricing />
        <Faq
          sorular={SORULAR}
          aciklama="Düğün salonu programı hakkında en çok sorulanlar."
          tinted
        />
        <CtaBand />
      </main>
      <SiteFooter />
      <WhatsAppFloat />
    </div>
  );
}
