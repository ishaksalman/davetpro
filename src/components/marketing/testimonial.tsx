import { Star } from "lucide-react";
import { CountUp } from "@/components/marketing/count-up";
import { PillLink } from "@/components/marketing/site-header";
import { Reveal } from "@/components/marketing/reveal";

/**
 * Referans + sayaçlar. Referans tasarımdaki koyu blok burada marka
 * lacivertiyle kuruluyor; sayaçlar görünür alana girince 0'dan sayıyor.
 */
export function Testimonial() {
  return (
    <section id="referanslar" className="bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-[1180px] px-5 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
          {/* Referans */}
          <Reveal>
            <figure className="relative flex h-full flex-col justify-between overflow-hidden rounded-[26px] bg-mk-ink p-8 text-white sm:p-10">
              {/* Köşedeki degrade parıltı */}
              <div
                aria-hidden
                className="pointer-events-none absolute -top-24 -right-20 size-64 rounded-full bg-[radial-gradient(circle,#0fbfd8_0%,transparent_68%)] opacity-40"
              />

              <div className="relative">
                <div className="flex gap-0.5" aria-label="5 üzerinden 5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="size-4 fill-[#f0b429] text-[#f0b429]" />
                  ))}
                </div>
                <blockquote className="mk-title mt-6 text-[clamp(1.35rem,2.4vw,1.75rem)] text-white">
                  &ldquo;Üç salonu ayrı ayrı defterde tutuyorduk. Kaporayı kimin
                  yatırdığını hatırlamak bile dertti. Şimdi ay sonunda hangi düğünün
                  ne kazandırdığını tek ekranda görüyorum.&rdquo;
                </blockquote>
              </div>

              <figcaption className="relative mt-10 flex items-center gap-3.5 border-t border-white/12 pt-6">
                <span
                  aria-hidden
                  className="grid size-11 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#1a5cff,#16e0b4)] text-[0.875rem] font-semibold"
                >
                  MÖ
                </span>
                <span>
                  <span className="block text-[0.9375rem] font-semibold">Mehmet Öztürk</span>
                  <span className="block text-[0.8125rem] text-white/60">
                    Beyaz Köşk Davet · Konya
                  </span>
                </span>
              </figcaption>
            </figure>
          </Reveal>

          {/* Sayaçlar */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
            <Reveal delay={80}>
              <div className="flex h-full flex-col justify-center rounded-[26px] border border-mk-line bg-mk-soft p-8">
                <p className="tabular text-[clamp(2.5rem,5vw,3.5rem)] leading-none font-semibold tracking-tight text-mk-ink">
                  <span className="mk-gradient-text">
                    <CountUp to={31} suffix="%" />
                  </span>
                </p>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-mk-body">
                  Kapora takibine geçen salonlarda ilk yılda ortalama tahsilat artışı.
                </p>
              </div>
            </Reveal>

            <Reveal delay={140}>
              <div className="flex h-full flex-col justify-center rounded-[26px] border border-mk-line bg-mk-soft p-8">
                <p className="tabular text-[clamp(2.5rem,5vw,3.5rem)] leading-none font-semibold tracking-tight text-mk-ink">
                  <CountUp to={6} suffix=" saat" />
                </p>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-mk-body">
                  Haftada kazanılan ofis zamanı — Excel, defter ve telefon trafiği
                  yerine tek panel.
                </p>
                <div className="mt-6">
                  <PillLink href="/kayit">
                    Hesabınızı açın
                  </PillLink>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
