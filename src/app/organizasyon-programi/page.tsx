import Link from "next/link";
import { Check } from "lucide-react";
import { Faq } from "@/components/marketing/faq";
import { PillLink, SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { WhatsAppFloat } from "@/components/marketing/whatsapp-float";
import { Reveal } from "@/components/marketing/reveal";
import { JsonLd } from "@/components/seo/json-ld";
import { LEAD_PIPELINE, LEAD_STATUS_LABELS, ORGANIZATION_TYPE_LABELS } from "@/lib/constants";
import { sayfaMetadata, yolVerisi, type Soru } from "@/lib/seo";
import { TRIAL_DAYS } from "@/lib/subscription";
import { VERTICALS } from "@/lib/vertical";

/*
 * Organizasyon firması iniş sayfası — "organizasyon programı", "organizasyon
 * takip programı", "organizasyon firması programı" aramaları için.
 *
 * Üründe üçüncü dikey olarak var (0041/0042) ama sitede hiç anlatılmıyordu;
 * bu aramayla gelen kişi "salon programı" görüp gidiyordu.
 *
 * Metindeki her iddia üründe var: dış mekân serbest alanı, eş zamanlı
 * kapasite, satış hattı aşamaları ve gider kalemleri koddan/migration'dan.
 * Aşama ve tür adları sabitlerden geliyor.
 */
export const metadata = sayfaMetadata({
  baslik: "Organizasyon Programı · Organizasyon Firmaları İçin",
  aciklama:
    "Organizasyon firmaları için iş takvimi, dış mekân takibi, teklif ve talep, kapora ve tahsilat, sözleşme ve organizasyon bazlı kârlılık. 30 gün ücretsiz deneyin.",
  yol: "/organizasyon-programi",
  paylasimBasligi: "Organizasyon programı · Tekliften kâra her iş tek panelde",
});

const OZELLIKLER = [
  {
    baslik: "Kendi salonunuz ve dış mekân aynı takvimde",
    metin:
      "Kendi mekânınız varsa orada çakışan saate ikinci iş açılmaz. Otel, bahçe, müşteri adresi gibi dış mekân işleri ayrı tutulur; adresi kayda yazılır ve aynı anda iki ayrı adreste iş olabilir.",
  },
  {
    baslik: "Aynı anda kaç işe yetişebiliyorsunuz?",
    metin:
      "Ayarlardan eş zamanlı kapasitenizi girin: aynı saat aralığına bu sayıdan fazla organizasyon yazılamaz. Aynı anda iki kişi kayıt girse bile sınır aşılmaz — kontrol veritabanında, sırayla yapılıyor.",
  },
  {
    baslik: "Talepten teklife, tekliften sözleşmeye",
    metin: `Gelen her talep bir aşamada durur: ${LEAD_PIPELINE.map((s) =>
      LEAD_STATUS_LABELS[s].toLocaleLowerCase("tr-TR"),
    ).join(", ")}. Bugün aranacak müşteriler ayrıca listelenir; teklif numaralı ve geçerlilik süreli çıkar, kazanılan talep tek tıkla rezervasyona döner.`,
  },
  {
    baslik: "Paket, ek hizmet ve kişi sayısı",
    metin:
      "Paketleri bir kez tanımlayın; ses ve ışık, dekorasyon, DJ, ulaşım gibi ek hizmetler tek tıkla eklenir. Kişi sayısı kayıtta tutulur, fiyat paket üzerinden hesaplanır.",
  },
  {
    baslik: "Kapora, kalan ödeme ve sözleşme",
    metin:
      "Kaporayı ve kalan ödeme tarihini girin; her tahsilatta kalan tutar güncellenir. Organizasyon hizmet sözleşmesi bilgilerle dolu çıkar, müşteriye WhatsApp'tan bağlantı olarak gönderilir.",
  },
  {
    baslik: "Organizasyon bazlı kârlılık",
    metin:
      "Mekân kirası, catering, ses ve ışık, nakliye, ekipman kirası… Giderleri organizasyona bağlayın; her işin ne kazandırdığı ayrı görünür. Satış organizasyon tarihine, tahsilat ve gider işlem tarihine yazılır.",
  },
];

const SORULAR: Soru[] = [
  {
    soru: "Organizasyon programı ne işe yarar?",
    cevap:
      "Talepleri, teklifleri, rezervasyonları, kapora ve tahsilatları, sözleşmeleri ve giderleri tek yerde toplar. Hangi gün kaç işiniz olduğu, hangi müşteriye teklif verildiği, kimden ne kadar alacak kaldığı ve her organizasyonun ne kazandırdığı tek ekranda görünür.",
  },
  {
    soru: "Kendi salonum yok, işlerim hep dış mekânda. Uygun mu?",
    cevap:
      "Evet. Kurulumda dış mekân alanı kendiliğinden açılır; işlerin adresini kayda yazarsınız. Dış mekânda çakışma yasağı yoktur, aynı gün birden çok adreste iş alabilirsiniz. Sınırı eş zamanlı kapasite ayarıyla siz belirlersiniz.",
  },
  {
    soru: "Aynı saate fazla iş yazılmasını nasıl engellerim?",
    cevap:
      "Ayarlardaki eş zamanlı rezervasyon kapasitesine bir sayı girin. O saat aralığında bu sayıya ulaşıldığında yeni kayıt açılmaz. Boş bırakırsanız sınır uygulanmaz; kendi salonunuzdaki çakışma kuralı ise her durumda işler.",
  },
  {
    soru: "Düğün dışında hangi organizasyonları takip edebilirim?",
    cevap:
      "Nişan, kına, söz, sünnet, davet ve kurumsal etkinlikler aynı takvimde. Raporlarda hangi tür organizasyonu daha çok yaptığınız ve hangisinin daha kârlı olduğu ayrı ayrı görünür.",
  },
  {
    soru: "Personelim fiyatları görmeden çalışabilir mi?",
    cevap:
      "Evet. Finans yetkisi verilmeyen kullanıcı takvimi, müşteriyi ve organizasyon ayrıntısını görür; fiyat, tahsilat ve kârlılık bilgisini görmez.",
  },
];

export default function OrganizasyonPage() {
  const sozluk = VERTICALS.organizasyon;

  return (
    <div className="mk-scope min-h-svh">
      <JsonLd
        data={yolVerisi([
          { ad: "DavetPro", yol: "/" },
          { ad: "Organizasyon programı", yol: "/organizasyon-programi" },
        ])}
      />
      <SiteHeader />

      <main>
        {/* Giriş */}
        <section className="bg-white pt-28 pb-16 lg:pt-36 lg:pb-20">
          <div className="mx-auto max-w-[1180px] px-5 sm:px-6">
            <Reveal className="mx-auto max-w-[46rem] text-center">
              <p className="text-[0.8125rem] font-semibold tracking-[0.14em] text-mk-muted uppercase">
                Organizasyon programı
              </p>
              <h1 className="mk-title mt-4 text-[clamp(2rem,4vw,3rem)] text-mk-ink">
                Tekliften kâra, her organizasyon tek panelde.
              </h1>
              <p className="mt-5 text-[1.0625rem] leading-relaxed text-mk-body">
                Organizasyon firmaları için iş takvimi, teklif ve talep takibi,
                kapora ve tahsilat, sözleşme ve gider yönetimi. Kendi
                salonunuzdaki ve dış mekândaki işler aynı yerde.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <PillLink href="/kayit">{TRIAL_DAYS} gün ücretsiz deneyin</PillLink>
                <Link
                  href="/fiyatlar"
                  className="text-[0.9375rem] font-medium text-mk-body underline-offset-4 hover:underline"
                >
                  Fiyatları görün
                </Link>
              </div>
              <p className="mt-4 text-[0.8125rem] text-mk-muted">Kart bilgisi istemiyoruz.</p>
            </Reveal>
          </div>
        </section>

        {/* Sorun */}
        <section className="bg-mk-soft py-16 lg:py-20">
          <div className="mx-auto max-w-[1180px] px-5 sm:px-6">
            <Reveal className="mx-auto max-w-[42rem] text-center">
              <h2 className="mk-title text-[clamp(1.5rem,2.6vw,2rem)] text-mk-ink">
                &ldquo;O cumartesi kaç işimiz vardı?&rdquo;
              </h2>
              <p className="mt-4 text-[1.0625rem] leading-relaxed text-mk-body">
                Organizasyon firmasının takvimi salonunkinden zordur: işler
                farklı adreslerde, aynı gün birden çok kurulum, her müşteriye
                ayrı paket. Defterde ve WhatsApp gruplarında dağılan bilgi
                burada tek kayıtta duruyor.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Özellikler */}
        <section className="bg-white py-16 lg:py-20">
          <div className="mx-auto max-w-[1180px] px-5 sm:px-6">
            <Reveal className="mx-auto max-w-[42rem] text-center">
              <h2 className="mk-title text-[clamp(1.5rem,2.6vw,2rem)] text-mk-ink">
                Organizasyon işine göre kurulmuş
              </h2>
              <p className="mt-4 text-[1.0625rem] leading-relaxed text-mk-body">
                Kayıt olurken &ldquo;{sozluk.label}&rdquo; seçiyorsunuz; mekânlar,
                gider kalemleri ve sözleşme metni buna göre geliyor.
              </p>
            </Reveal>

            <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {OZELLIKLER.map((o, i) => (
                <Reveal key={o.baslik} delay={i * 70}>
                  <div className="flex h-full flex-col rounded-[20px] border border-mk-line bg-white p-6">
                    <h3 className="text-[1.0625rem] font-semibold tracking-tight text-mk-ink">
                      {o.baslik}
                    </h3>
                    <p className="mt-3 text-[0.9375rem] leading-relaxed text-mk-body">{o.metin}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* İş türleri */}
        <section className="bg-mk-soft py-16 lg:py-20">
          <div className="mx-auto max-w-[1180px] px-5 sm:px-6">
            <Reveal className="mx-auto max-w-[42rem] text-center">
              <h2 className="mk-title text-[clamp(1.5rem,2.6vw,2rem)] text-mk-ink">
                Düğünden kurumsal etkinliğe
              </h2>
              <p className="mt-4 text-[1.0625rem] leading-relaxed text-mk-body">
                Yaptığınız her organizasyon aynı takvimde; raporlarda türüne göre
                ayrı ayrı görünür.
              </p>
            </Reveal>

            <ul className="mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-2.5">
              {sozluk.eventTypes.map((t) => (
                <li
                  key={t}
                  className="flex items-center gap-2 rounded-full border border-mk-line bg-white px-4 py-2 text-[0.875rem] text-mk-ink"
                >
                  <Check className="size-4 text-mk-accent" aria-hidden />
                  {ORGANIZATION_TYPE_LABELS[t]}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <Faq
          sorular={SORULAR}
          aciklama="Organizasyon firması programı hakkında en çok sorulanlar."
        />

        {/* İlgili rehberler — iç bağlantı */}
        <section className="bg-mk-tint py-16 lg:py-20">
          <div className="mx-auto max-w-[1180px] px-5 sm:px-6">
            <Reveal className="mx-auto max-w-[42rem] text-center">
              <h2 className="mk-title text-[clamp(1.5rem,2.6vw,2rem)] text-mk-ink">
                Organizasyon işini büyütürken
              </h2>
            </Reveal>
            <ul className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { href: "/blog/organizasyon-fiyat-teklifi", ad: "Organizasyon fiyat teklifinde neler olmalı?" },
                { href: "/blog/kapora-ne-kadar-alinmali", ad: "Kapora ne kadar alınmalı, sözleşmede nasıl yazılır?" },
                { href: "/dugun-salonu-sozlesme-ornegi", ad: "Organizasyon hizmet sözleşmesi örneği" },
                { href: "/blog/dugun-salonu-karlilik-hesabi", ad: "Organizasyonda kârlılık nasıl hesaplanır?" },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="block rounded-[16px] border border-mk-line bg-white px-5 py-4 text-[0.9375rem] font-medium text-mk-ink transition-shadow hover:shadow-[0_18px_40px_-30px_rgba(11,18,32,0.4)]"
                  >
                    {l.ad}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Kapanış */}
        <section className="bg-white py-16 lg:py-24">
          <div className="mx-auto max-w-[1180px] px-5 sm:px-6">
            <Reveal className="mx-auto max-w-[42rem] rounded-[28px] bg-mk-ink px-8 py-12 text-center">
              <h2 className="mk-title text-[clamp(1.5rem,2.6vw,2rem)] text-white">
                {TRIAL_DAYS} gün ücretsiz deneyin
              </h2>
              <p className="mt-4 text-[1.0625rem] leading-relaxed text-white/70">
                Kart bilgisi istemiyoruz, deneme sonunda kendiliğinden bir
                tahsilat olmuyor. Süre biterse kayıtlarınız silinmiyor.
              </p>
              <div className="mt-8 flex justify-center">
                <PillLink href="/kayit">Hemen başlayın</PillLink>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <SiteFooter />
      <WhatsAppFloat />
    </div>
  );
}
