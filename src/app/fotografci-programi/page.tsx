import type { Metadata } from "next";
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

/*
 * Fotoğrafçı/stüdyo iniş sayfası.
 *
 * NEDEN AYRI SAYFA: anasayfa "Salonunuzun tüm işi" diyor. Ürünün yarısı
 * fotoğrafçıya ait ama site bunu hiç söylemiyordu; ticari niyetle arayan
 * stüdyo sahibi salon diliyle karşılaşıp gidiyordu.
 *
 * Metindeki her iddia üründe var. Aşama adları ve çekim türleri sabit
 * yazılmıyor, sözlükten ve enum'dan geliyor — ürün değişince sayfa da
 * değişsin, iki yer ayrışmasın.
 */
export const metadata: Metadata = {
  title: "Fotoğrafçılar için iş takip programı",
  description:
    "Fotoğraf stüdyoları için çekim takvimi, plato çakışma kontrolü, ekip ataması ve teslim takibi. Çekimden albüm teslimine tek panelde. 30 gün ücretsiz deneyin.",
  alternates: { canonical: "/fotografci-programi" },
  openGraph: {
    title: "Fotoğrafçılar için iş takip programı · DavetPro",
    description:
      "Çekim takvimi, plato çakışma kontrolü, ekip ataması ve teslim takibi. Çekimden albüm teslimine tek panelde.",
    url: "/fotografci-programi",
  },
};

const OZELLIKLER = [
  {
    baslik: "Aynı platoda aynı saate ikinci çekim açılmaz",
    metin:
      "Çakışma veritabanı düzeyinde engelleniyor — uyarı değil, kesin engel. Üstelik iki çekim arasında en az 1 saat boşluk zorunlu. Plato dışı işler için “Diğer” alanı var; orada bu kural işlemiyor, çünkü aynı anda iki ayrı adreste çekim olabilir.",
  },
  {
    baslik: "Ekip ataması",
    metin:
      "Hangi çekime hangi ekibin gittiği kayıtlı. Atama zorunlu değil, sonradan da yapılabilir — iş alındığında ekip henüz belli olmayabiliyor.",
  },
  {
    baslik: "Çekimden teslime akış",
    metin:
      "Her iş nerede kaldıysa orada duruyor. Teslim edilen iş listeden düşüyor, kalanlar bekliyor.",
  },
  {
    baslik: "Telif maddeli sözleşme",
    metin:
      "Fotoğraf ve video hizmet sözleşmesi hazır geliyor; kullanım ve telif hakları maddesi dahil. Kendi metninizi yazarsanız o korunuyor.",
  },
  {
    baslik: "Paket ve ek hizmetler",
    metin:
      "Paketi seçin, tutar kendiliğinden çıksın. Dış çekim, drone, albüm, video klip gibi kalemler tek tıkla eklenir.",
  },
  {
    baslik: "Çekim bazlı kârlılık",
    metin:
      "Her işin geliri ve gideri ayrı hesaplanıyor. Hangi çekimin kazandırdığı görünüyor; kârlılık ile nakit akışı birbirine karışmıyor.",
  },
];

export default function FotografciPage() {
  const sozluk = VERTICALS.fotografci;

  return (
    <div className="mk-scope min-h-svh">
      <SiteHeader />

      <main>
        {/* Giriş */}
        <section className="bg-white pt-28 pb-16 lg:pt-36 lg:pb-20">
          <div className="mx-auto max-w-[1180px] px-5 sm:px-6">
            <Reveal className="mx-auto max-w-[46rem] text-center">
              <p className="text-[0.8125rem] font-semibold tracking-[0.14em] text-mk-muted uppercase">
                Fotoğrafçılar için
              </p>
              <h1 className="mk-title mt-4 text-[clamp(2rem,4vw,3rem)] text-mk-ink">
                Çekimden albüm teslimine tek panelde.
              </h1>
              <p className="mt-5 text-[1.0625rem] leading-relaxed text-mk-body">
                Stüdyonuzun takvimi, ekipleri, tahsilatları ve teslim takibi bir
                arada. Hangi işin nerede kaldığını aramakla vakit kaybetmeyin.
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
