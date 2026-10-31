import Link from "next/link";
import { ArrowUpRight, Camera, PartyPopper, Building2 } from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";

/**
 * "Kimler için" — üç iş türünün kendi sayfasına giden bağlantılar.
 *
 * Arama açısından asıl işi iç bağlantı: anasayfa sitenin en güçlü sayfası ve
 * buradan verilen bağlantı, alt sayfaların "organizasyon programı",
 * "fotoğrafçı programı" gibi aramalarda bulunmasını hızlandırıyor.
 */
const KITLELER = [
  {
    icon: Building2,
    baslik: "Düğün salonları",
    metin: "Salon takvimi, kişi başı fiyat, kapora ve kalan ödeme, sözleşme. Birden çok salonu tek takvimde yönetin.",
    href: "/#ozellikler",
    etiket: "Özellikleri görün",
  },
  {
    icon: PartyPopper,
    baslik: "Organizasyon firmaları",
    metin: "Kendi mekânınızda ve dış mekânda işler, aynı anda kaç işe yetişebileceğiniz, paket ve ek hizmetler.",
    href: "/organizasyon-programi",
    etiket: "Organizasyon programı",
  },
  {
    icon: Camera,
    baslik: "Fotoğrafçılar",
    metin: "Çekim takvimi, ekip ataması, albüm ve dijital teslim takibi, telif maddeli sözleşme.",
    href: "/fotografci-programi",
    etiket: "Fotoğrafçı programı",
  },
];

export function Audiences() {
  return (
    <section className="bg-white py-20 lg:py-24">
      <div className="mx-auto max-w-[1180px] px-5 sm:px-6">
        <Reveal className="mx-auto max-w-[42rem] text-center">
          <p className="text-[0.8125rem] font-semibold tracking-[0.14em] text-mk-muted uppercase">
            Kimler için
          </p>
          <h2 className="mk-title mt-4 text-[clamp(1.9rem,3.4vw,2.5rem)] text-mk-ink">
            İşinizin cinsine göre kuruluyor
          </h2>
          <p className="mt-5 text-[1.0625rem] leading-relaxed text-mk-body">
            Kayıt olurken işinizi seçiyorsunuz; menüler, formlar, sözleşme metni
            ve gider kalemleri ona göre geliyor.
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
          {KITLELER.map((k, i) => (
            <Reveal key={k.baslik} delay={i * 80}>
              <Link
                href={k.href}
                className="group flex h-full flex-col rounded-[22px] border border-mk-line bg-white p-7 transition-shadow hover:shadow-[0_18px_40px_-28px_rgba(11,18,32,0.4)]"
              >
                <k.icon className="size-6 text-mk-ink" strokeWidth={1.6} />
                <h3 className="mk-title mt-5 text-[1.25rem] text-mk-ink">{k.baslik}</h3>
                <p className="mt-3 flex-1 text-[0.9375rem] leading-relaxed text-mk-body">{k.metin}</p>
                <span className="mt-6 inline-flex items-center gap-1.5 text-[0.9375rem] font-semibold text-mk-ink">
                  {k.etiket}
                  <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
