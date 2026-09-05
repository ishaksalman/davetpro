import Link from "next/link";
import { PillLink } from "@/components/marketing/site-header";
import { Reveal } from "@/components/marketing/reveal";

/** Sayfanın kapanış çağrısı — referans tasarımdaki geniş koyu blok. */
export function CtaBand() {
  return (
    <section className="bg-white px-5 pb-20 sm:px-6 lg:pb-28">
      <div className="mx-auto max-w-[1180px]">
        <Reveal>
          <div className="relative overflow-hidden rounded-[30px] bg-mk-ink px-7 py-16 text-center sm:px-12 lg:py-24">
            {/* Zemindeki degrade ışık */}
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-32 left-1/2 size-[32rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,#0fbfd8_0%,transparent_66%)] opacity-30"
            />

            <div className="relative mx-auto max-w-[40rem]">
              <h2 className="mk-display text-[clamp(2rem,4.4vw,3.25rem)] text-white">
                Bu sezonu <span className="mk-gradient-text">defterle</span> kapatmayın.
              </h2>
              <p className="mx-auto mt-6 max-w-[32rem] text-[1.0625rem] leading-relaxed text-white/65">
                Hesabınızı açın, salonlarınızı tanımlayın, ilk rezervasyonunuzu
                bugün girin. Kurulum ve kart gerekmez.
              </p>

              <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
                <PillLink href="/kayit">
                  Ücretsiz başlayın
                </PillLink>
                <Link
                  href="/giris"
                  className="text-[0.9375rem] font-medium text-white/80 underline-offset-4 hover:text-white hover:underline"
                >
                  Hesabım var, giriş yapayım
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
