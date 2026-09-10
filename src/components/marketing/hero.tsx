import Link from "next/link";
import { CirclePlay, Star } from "lucide-react";
import { AppMockup } from "@/components/marketing/app-mockup";
import { PillLink } from "@/components/marketing/site-header";
import { FadeIn } from "@/components/marketing/reveal";
import { ScrollScale } from "@/components/marketing/scroll-scale";
import { TRIAL_DAYS } from "@/lib/subscription";

/**
 * Hero — marka lacivertinde koyu bir bant.
 *
 * İçerideki metin ve kenarlıklar beyazın saydam tonlarıyla kuruluyor
 * (`text-white/65` gibi); böylece zemin tonu ileride değişse de hiyerarşi
 * bozulmuyor. Ürün görseli açık kalıyor: koyu zeminde duran aydınlık panel
 * hero'nun asıl odağı.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden bg-mk-ink pt-24 pb-20 lg:pt-28 lg:pb-28">
      <div className="relative mx-auto max-w-[1180px] px-5 sm:px-6">
        {/* Söz — ortalanmış */}
        <div className="mx-auto max-w-[46rem] text-center">
          <FadeIn>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 py-1.5 pr-4 pl-1.5 text-[0.8125rem] font-medium text-white/70 backdrop-blur">
              <span className="rounded-full bg-mk-accent px-2.5 py-1 text-[0.6875rem] font-semibold text-mk-accent-ink">
                Yeni
              </span>
              Sözleşme ve teklif çıktısı hazır
            </span>
          </FadeIn>

          <FadeIn delay={60}>
            <h1 className="mk-display mt-7 text-[clamp(2.5rem,6.4vw,4.75rem)] text-white">
              Salonunuzun tüm işi{" "}
              <span className="mk-gradient-text">tek bir panelde</span>.
            </h1>
          </FadeIn>

          <FadeIn delay={120}>
            <p className="mx-auto mt-6 max-w-[34rem] text-[1.0625rem] leading-relaxed text-white/60">
              Düğün, nişan, kına ve kurumsal organizasyonlar için rezervasyon,
              tahsilat ve kârlılık takibi. Excel&apos;e ve deftere gerek kalmadan.
            </p>
          </FadeIn>

          <FadeIn delay={180}>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
              <PillLink href="/kayit">{TRIAL_DAYS} gün ücretsiz deneyin</PillLink>
              <Link
                href="#nasil-calisir"
                className="group inline-flex items-center gap-2 text-[0.9375rem] font-medium text-white"
              >
                <CirclePlay className="size-5 text-white/45 transition-colors group-hover:text-white" />
                <span className="underline-offset-4 group-hover:underline">
                  Nasıl çalıştığını görün
                </span>
              </Link>
            </div>
          </FadeIn>

          <FadeIn delay={240}>
            <div className="mt-8 flex items-center justify-center gap-3.5">
              <div className="flex -space-x-2" aria-hidden>
                {["#1a5cff", "#0fbfd8", "#16e0b4", "#f7f9fc"].map((c) => (
                  <span
                    key={c}
                    style={{ background: c }}
                    className="size-7 rounded-full border-2 border-mk-ink"
                  />
                ))}
              </div>
              <p className="text-[0.8125rem] text-white/60">
                <span className="inline-flex items-center gap-1 font-semibold text-white">
                  4,9 <Star className="size-3.5 fill-[#f0b429] text-[#f0b429]" />
                </span>{" "}
                · 180+ salon DavetPro ile çalışıyor
              </p>
            </div>
          </FadeIn>
        </div>

        {/* Ürün — kaydırdıkça büyür. Çerçevenin genişliği sabit; yalnızca
            ölçek değiştiği için yatay taşma olmaz. */}
        <ScrollScale className="mt-10 lg:mt-12">
          <div className="relative">
            {/* Degrade parıltı — çerçevenin üst kenarından taşar. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-[8%] -top-4 h-32 rounded-full bg-[linear-gradient(90deg,#1a5cff,#0fbfd8,#16e0b4)] opacity-55 blur-3xl"
            />
            <div className="relative rounded-[26px] border border-white/12 bg-white/8 p-3 shadow-[0_40px_90px_-40px_rgba(0,0,0,0.75)] backdrop-blur">
              <AppMockup className="w-full" />
            </div>
          </div>
        </ScrollScale>
      </div>
    </section>
  );
}
