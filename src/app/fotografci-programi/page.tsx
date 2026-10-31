import Link from "next/link";
import { Check } from "lucide-react";
import { PillLink, SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { WhatsAppFloat } from "@/components/marketing/whatsapp-float";
import { Reveal } from "@/components/marketing/reveal";
import {
  DELIVERY_STATUS_FLOW,
  DELIVERY_STATUS_LABELS,
  ORGANIZATION_TYPE_LABELS,
} from "@/lib/constants";
import { VERTICALS } from "@/lib/vertical";
import { TRIAL_DAYS } from "@/lib/subscription";
import { Faq } from "@/components/marketing/faq";
import { JsonLd } from "@/components/seo/json-ld";
import { sayfaMetadata, yolVerisi, type Soru } from "@/lib/seo";

/*
 * Fotoğrafçı/stüdyo iniş sayfası — "fotoğrafçı programı", "fotoğraf stüdyosu
 * programı", "fotoğrafçı müşteri takip programı" aramaları için.
 *
 * NEDEN AYRI SAYFA: anasayfa "Salonunuzun tüm işi" diyor. Ürünün bir kısmı
 * fotoğrafçıya ait ama site bunu hiç söylemiyordu; ticari niyetle arayan
 * stüdyo sahibi salon diliyle karşılaşıp gidiyordu.
 *
 * Metindeki her iddia üründe var. Aşama adları ve çekim türleri sabit
 * yazılmıyor, sözlükten ve enum'dan geliyor — ürün değişince sayfa da
 * değişsin, iki yer ayrışmasın. (Plato çakışma kuralı 3ff4786'da kalktı;
 * sayfa bir süre onu anlatmaya devam etmişti.)
 */
export const metadata = sayfaMetadata({
  baslik: "Fotoğrafçı Programı · Çekim ve Teslim Takibi",
  aciklama:
    "Fotoğrafçılar ve stüdyolar için çekim takvimi, ekip ataması, albüm ve dijital teslim takibi, kapora takibi ve telif maddeli sözleşme. 30 gün ücretsiz deneyin.",
  yol: "/fotografci-programi",
  paylasimBasligi: "Fotoğrafçı programı · Çekimden albüm teslimine tek panelde",
});

const OZELLIKLER = [
  {
    baslik: "Çekim takvimi ve ekip ataması",
    metin:
      "Tüm çekimler tek takvimde, her ekip kendi renginde. Hangi çekime hangi ekibin gittiği kayıtlı; atama zorunlu değil, iş alındığında ekip henüz belli değilse sonradan yapılır.",
  },
  {
    baslik: "Teslim panosu ve hedef tarih",
    metin:
      "Çekimi yapılmış her iş bir aşamada duruyor. Her işe teslim hedef tarihi verilebiliyor; geciken işler ayrıca sayılıyor ve listenin üstüne çıkıyor. Teslim edilen iş panodan düşüyor.",
  },
  {
    baslik: "Galeri bağlantısını müşteriye gönderin",
    metin:
      "Drive, Pixieset, WeTransfer… Teslim bağlantısını işe kaydedin, müşteriye WhatsApp'tan tek dokunuşla gönderin. Bağlantı kayıtta kalıyor, “linki tekrar atar mısınız” mesajına aramadan cevap verirsiniz.",
  },
  {
    baslik: "Telif maddeli sözleşme",
    metin:
      "Fotoğraf ve video hizmet sözleşmesi hazır geliyor; teslim süresi, ham dosyaların saklanması, kullanım ve telif hakları maddeleri dahil. Kendi metninizi yazarsanız o korunuyor. Sözleşmeyi müşteriye bağlantıyla da gönderebilirsiniz.",
  },
  {
    baslik: "Paket ve ek hizmetler",
    metin:
      "Paketi seçin, tutar kendiliğinden çıksın. Dış çekim, drone, albüm, video klip, save the date gibi kalemler tek tıkla eklenir; sözleşmede ve teklifte ayrı satır olarak görünür.",
  },
  {
    baslik: "Kapora, kalan ödeme ve kârlılık",
    metin:
      "Kapora ve kalan ödeme her çekimde ayrı izleniyor; teslim panosunda kalan bakiye de görünüyor. Her işin geliri ve gideri ayrı hesaplanıyor — albüm baskısı, asistan, ulaşım. Hangi çekimin kazandırdığı görünüyor.",
  },
];

const SORULAR: Soru[] = [
  {
    soru: "Fotoğrafçı programı ne işe yarar?",
    cevap:
      "Çekim takvimini, müşteri kayıtlarını, kapora ve kalan ödemeleri, sözleşmeyi ve teslim sürecini tek yerde toplar. Defter, WhatsApp yazışmaları ve Excel arasında dağılan bilgi tek ekranda görünür: hangi gün kimin çekimi var, hangi albüm baskıda, kimden ne kadar alacak kaldı.",
  },
  {
    soru: "Albüm ve dijital teslimleri nasıl takip ediyorum?",
    cevap: `Çekimi yapılan iş teslim panosuna düşer ve aşamalardan geçer: ${DELIVERY_STATUS_FLOW.map(
      (a) => DELIVERY_STATUS_LABELS[a].toLocaleLowerCase("tr-TR"),
    ).join(", ")}. Her işe hedef tarih verebilirsiniz; geciken işler ayrıca gösterilir.`,
  },
  {
    soru: "Aynı gün birden fazla çekim alabilir miyim?",
    cevap:
      "Evet. Fotoğrafçıda çekimler müşterinin mekânında, dışarıda ya da başka şehirde olduğu için çakışma yasağı uygulanmaz. Hangi ekibin hangi çekime gittiğini atayarak günü planlarsınız; ekipler takvimde kendi renginde görünür.",
  },
  {
    soru: "Sözleşmede telif ve kullanım hakkı nasıl yazılıyor?",
    cevap:
      "Hazır gelen sözleşmede eser sahipliğinin fotoğrafçıda kaldığı, müşterinin kişisel kullanım hakkı, ticari kullanımın yazılı izne bağlı olduğu ve portfolyo kullanımı için müşteri onayı maddeleri var. Metni dilediğiniz gibi değiştirebilirsiniz.",
  },
  {
    soru: "Stüdyo çekimleri ve vesikalık da takip edilebilir mi?",
    cevap:
      "Evet. Düğün ve nişanın yanında dış çekim, vesikalık, portre, stüdyo, ürün ve video/etkinlik işleri aynı takvimde; raporlarda hangi tür işi daha çok yaptığınız ayrı ayrı görünür.",
  },
];

export default function FotografciPage() {
  const sozluk = VERTICALS.fotografci;

  return (
    <div className="mk-scope min-h-svh">
      <JsonLd
        data={yolVerisi([
          { ad: "DavetPro", yol: "/" },
          { ad: "Fotoğrafçı programı", yol: "/fotografci-programi" },
        ])}
      />
      <SiteHeader />

      <main>
        {/* Giriş */}
        <section className="bg-white pt-28 pb-16 lg:pt-36 lg:pb-20">
          <div className="mx-auto max-w-[1180px] px-5 sm:px-6">
            <Reveal className="mx-auto max-w-[46rem] text-center">
              <p className="text-[0.8125rem] font-semibold tracking-[0.14em] text-mk-muted uppercase">
                Fotoğrafçı programı
              </p>
              <h1 className="mk-title mt-4 text-[clamp(2rem,4vw,3rem)] text-mk-ink">
                Çekimden albüm teslimine tek panelde.
              </h1>
              <p className="mt-5 text-[1.0625rem] leading-relaxed text-mk-body">
                Fotoğrafçılar ve fotoğraf stüdyoları için çekim takvimi, ekip
                ataması, kapora takibi ve albüm teslimi bir arada. Hangi işin
                nerede kaldığını aramakla vakit kaybetmeyin.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <PillLink href="/kayit">
                  {TRIAL_DAYS} gün ücretsiz deneyin
                </PillLink>
                <Link
                  href="/fiyatlar"
                  className="text-[0.9375rem] font-medium text-mk-body underline-offset-4 hover:underline"
                >
                  Fiyatları görün
                </Link>
              </div>
              <p className="mt-4 text-[0.8125rem] text-mk-muted">
                Kart bilgisi istemiyoruz.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Teslim akışı */}
        <section className="bg-mk-soft py-16 lg:py-20">
          <div className="mx-auto max-w-[1180px] px-5 sm:px-6">
            <Reveal className="mx-auto max-w-[42rem] text-center">
              <h2 className="mk-title text-[clamp(1.5rem,2.6vw,2rem)] text-mk-ink">
                &ldquo;Albüm baskıda mıydı, seçimde mi?&rdquo;
              </h2>
              <p className="mt-4 text-[1.0625rem] leading-relaxed text-mk-body">
                Her çekim bir aşamada duruyor. Teslim edilen iş listeden düşüyor,
                kalanlar bekliyor.
              </p>
            </Reveal>

            <ol className="mx-auto mt-10 flex max-w-4xl flex-wrap items-center justify-center gap-2.5">
              <li className="rounded-full border border-mk-line bg-white px-4 py-2 text-[0.875rem] font-medium text-mk-ink">
                Oluşturuldu
              </li>
              {DELIVERY_STATUS_FLOW.map((asama) => (
                <li
                  key={asama}
                  className="rounded-full border border-mk-line bg-white px-4 py-2 text-[0.875rem] font-medium text-mk-ink"
                >
                  {DELIVERY_STATUS_LABELS[asama]}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Özellikler */}
        <section className="bg-white py-16 lg:py-20">
          <div className="mx-auto max-w-[1180px] px-5 sm:px-6">
            <Reveal className="mx-auto max-w-[42rem] text-center">
              <h2 className="mk-title text-[clamp(1.5rem,2.6vw,2rem)] text-mk-ink">
                Stüdyo işine göre kurulmuş
              </h2>
              <p className="mt-4 text-[1.0625rem] leading-relaxed text-mk-body">
                Salon yazılımının üstüne yamanmış bir mod değil. Kayıt olurken
                &ldquo;{sozluk.label}&rdquo; seçiyorsunuz; panel buna göre
                kuruluyor.
              </p>
            </Reveal>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {OZELLIKLER.map((o, i) => (
                <Reveal key={o.baslik} delay={i * 70}>
                  <div className="flex h-full flex-col rounded-[20px] border border-mk-line bg-white p-6">
                    <h3 className="text-[1.0625rem] font-semibold tracking-tight text-mk-ink">
                      {o.baslik}
                    </h3>
                    <p className="mt-3 text-[0.9375rem] leading-relaxed text-mk-body">
                      {o.metin}
                    </p>
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
                Sadece düğün değil
              </h2>
              <p className="mt-4 text-[1.0625rem] leading-relaxed text-mk-body">
                Stüdyonun yaptığı her iş aynı takvimde. Raporlarda hangi tür işi
                daha çok yaptığınız ayrı ayrı görünüyor.
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
          aciklama="Fotoğrafçı ve stüdyo programı hakkında en çok sorulanlar."
        />

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
