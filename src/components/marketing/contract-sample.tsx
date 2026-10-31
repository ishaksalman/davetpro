import Link from "next/link";
import { PrintButton } from "@/app/s/[token]/print-button";
import { Faq } from "@/components/marketing/faq";
import { PillLink, SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { WhatsAppFloat } from "@/components/marketing/whatsapp-float";
import { Reveal } from "@/components/marketing/reveal";
import { JsonLd } from "@/components/seo/json-ld";
import { yolVerisi, type Soru } from "@/lib/seo";
import { sablonuAyristir } from "@/lib/sozlesme-ornegi";
import { TRIAL_DAYS } from "@/lib/subscription";

/**
 * Sözleşme örneği sayfası iskeleti (salon ve fotoğrafçı aynı düzeni kullanıyor).
 *
 * NEDEN BU SAYFA: Search Console'da sitenin en çok gösterim alan sorgusu
 * "düğün salonu sözleşmesi". Arayan kişi metnin kendisini istiyor; blog
 * yazısı neler olması gerektiğini anlatıyor ama örnek vermiyordu. Ürünün
 * kendi şablonu tam olarak bu ihtiyaç — gösterip "boşlukları DavetPro
 * dolduruyor" demek, aramayı kayda bağlayan en doğal yol.
 *
 * Belge `.contract-sheet` sınıfını taşıyor: globals.css'teki baskı kuralları
 * yazdırırken sayfanın geri kalanını gizleyip yalnızca metni basıyor.
 */
export function ContractSample({
  sablon,
  etiketler,
  ustBaslik,
  baslik,
  giris,
  yol,
  yolAdi,
  ipuclari,
  sorular,
  ilgili,
}: {
  sablon: string;
  etiketler?: Record<string, string>;
  ustBaslik: string;
  baslik: string;
  giris: string;
  yol: string;
  yolAdi: string;
  ipuclari: { baslik: string; metin: string }[];
  sorular: Soru[];
  ilgili: { href: string; ad: string }[];
}) {
  const belge = sablonuAyristir(sablon, etiketler);

  return (
    <div className="mk-scope min-h-svh">
      <JsonLd
        data={yolVerisi([
          { ad: "DavetPro", yol: "/" },
          { ad: yolAdi, yol },
        ])}
      />
      <SiteHeader />

      <main>
        <section className="bg-white pt-28 pb-12 lg:pt-36 lg:pb-16">
          <div className="mx-auto max-w-[1180px] px-5 sm:px-6">
            <Reveal className="mx-auto max-w-[46rem] text-center">
              <p className="text-[0.8125rem] font-semibold tracking-[0.14em] text-mk-muted uppercase">
                {ustBaslik}
              </p>
              <h1 className="mk-title mt-4 text-[clamp(2rem,4vw,3rem)] text-mk-ink">{baslik}</h1>
              <p className="mt-5 text-[1.0625rem] leading-relaxed text-mk-body">{giris}</p>
              <div className="no-print mt-8 flex flex-wrap items-center justify-center gap-3">
                <PillLink href="/kayit">Bilgilerle dolu hâlini oluşturun</PillLink>
                <PrintButton />
              </div>
            </Reveal>
          </div>
        </section>

        {/* Belge */}
        <section className="bg-mk-tint py-12 lg:py-16">
          <div className="mx-auto max-w-[1180px] px-3 sm:px-6">
            <article className="contract-sheet sample-sheet mx-auto max-w-[52rem] rounded-[6px] shadow-[0_30px_70px_-40px_rgba(11,18,32,0.45)]">
              <h2 className="text-center text-[1.125rem] font-bold tracking-[0.06em]">
                {belge.baslik}
              </h2>
              <div className="mt-8 flex flex-col gap-6">
                {belge.maddeler.map((m) => (
                  <section key={m.baslik}>
                    <h3 className="text-[0.9375rem] font-bold">{m.baslik}</h3>
                    <p className="mt-1.5 text-mk-body">
                      {m.paragraf.map((p, i) =>
                        p.tur === "metin" ? (
                          <span key={i}>{p.metin}</span>
                        ) : (
                          <mark
                            key={i}
                            className="rounded bg-[#e8f0ff] px-1 py-px font-medium text-[#1a3fb8] print:bg-transparent print:text-mk-ink"
                          >
                            [{p.etiket}]
                          </mark>
                        ),
                      )}
                    </p>
                  </section>
                ))}
              </div>
              <div className="mt-12 grid grid-cols-2 gap-8 text-center text-[0.875rem]">
                <div>
                  <p className="font-semibold">İŞLETME / HİZMET SAĞLAYICI</p>
                  <p className="mt-10 border-t border-mk-line pt-2 text-mk-muted">İmza</p>
                </div>
                <div>
                  <p className="font-semibold">MÜŞTERİ</p>
                  <p className="mt-10 border-t border-mk-line pt-2 text-mk-muted">İmza</p>
                </div>
              </div>
            </article>

            <p className="no-print mx-auto mt-5 max-w-[52rem] px-2 text-[0.8125rem] leading-relaxed text-mk-muted">
              Bu metin genel bir örnektir, hukuki danışmanlık yerine geçmez. İptal,
              iade ve teslim süresi gibi maddeleri kendi koşullarınıza göre
              doldurun; tereddüt ettiğiniz noktada bir avukata danışın.
            </p>
          </div>
        </section>

        {/* Doldururken */}
        <section className="no-print bg-white py-16 lg:py-20">
          <div className="mx-auto max-w-[1180px] px-5 sm:px-6">
            <Reveal className="mx-auto max-w-[42rem] text-center">
              <h2 className="mk-title text-[clamp(1.5rem,2.6vw,2rem)] text-mk-ink">
                Doldururken dikkat edilecekler
              </h2>
              <p className="mt-4 text-[1.0625rem] leading-relaxed text-mk-body">
                Sonradan tartışma çıkaran neredeyse her şey bu maddelerin boş ya da
                belirsiz bırakılmasından doğuyor.
              </p>
            </Reveal>
            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {ipuclari.map((t) => (
                <div key={t.baslik} className="rounded-[20px] border border-mk-line bg-white p-6">
                  <h3 className="text-[1.0625rem] font-semibold tracking-tight text-mk-ink">{t.baslik}</h3>
                  <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-mk-body">{t.metin}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Ürüne köprü */}
        <section className="no-print bg-white pb-16 lg:pb-20">
          <div className="mx-auto max-w-[1180px] px-5 sm:px-6">
            <Reveal className="mx-auto max-w-[46rem] rounded-[28px] bg-mk-ink px-8 py-12 text-center">
              <h2 className="mk-title text-[clamp(1.5rem,2.6vw,2rem)] text-white">
                Köşeli parantezleri elle doldurmayın
              </h2>
              <p className="mt-4 text-[1.0625rem] leading-relaxed text-white/70">
                DavetPro&apos;da rezervasyonu girdiğinizde bu sözleşme müşteri, tarih,
                paket, kapora ve kalan ödeme bilgileriyle dolu hazırlanır. Yazdırın
                ya da müşteriye WhatsApp&apos;tan bağlantıyla gönderin. Metni kendi
                maddelerinizle değiştirebilirsiniz.
              </p>
              <div className="mt-8 flex justify-center">
                <PillLink href="/kayit">{TRIAL_DAYS} gün ücretsiz deneyin</PillLink>
              </div>
            </Reveal>
          </div>
        </section>

        <div className="no-print">
          <Faq sorular={sorular} tinted />

          <section className="bg-white py-16 lg:py-20">
            <div className="mx-auto max-w-[1180px] px-5 sm:px-6">
              <h2 className="mk-title text-center text-[clamp(1.5rem,2.6vw,2rem)] text-mk-ink">
                İlgili rehberler
              </h2>
              <ul className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2">
                {ilgili.map((l) => (
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
        </div>
      </main>

      <div className="no-print">
        <SiteFooter />
        <WhatsAppFloat />
      </div>
    </div>
  );
}
