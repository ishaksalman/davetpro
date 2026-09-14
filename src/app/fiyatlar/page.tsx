import type { Metadata } from "next";
import { Check } from "lucide-react";
import { PillLink, SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Reveal } from "@/components/marketing/reveal";
import { formatMoney } from "@/lib/format";
import {
  BILLING_TERMS,
  BILLING_WHATSAPP,
  FREE_MONTHS_YEARLY,
  MONTHLY_PRICE,
  PLAN_FEATURES,
  TRIAL_DAYS,
} from "@/lib/subscription";
import { cn } from "@/lib/utils";

/*
 * Ayrı sayfa, anasayfadaki fiyat bölümünün kopyası DEĞİL. Oradaki bölüm
 * dönüşüm akışının parçası: rakamı gösterip kayda yönlendiriyor. Burası
 * "davetpro fiyat" diye arayan kişinin indiği sayfa; asıl içerik aşağıdaki
 * açıklamalar. İki URL aynı metni taşısaydı birbiriyle yarışırlardı.
 */
export const metadata: Metadata = {
  title: "Fiyatlar",
  description:
    "DavetPro fiyatları: tek paket, salon ve kullanıcı sınırı yok. 6 aylık ve 12 aylık abonelik, 30 gün ücretsiz deneme. Ödeme, iptal ve deneme sonrası ne olduğu hakkında her şey.",
  alternates: { canonical: "/fiyatlar" },
  openGraph: {
    title: "DavetPro fiyatları",
    description:
      "Tek paket, her şey dahil. 6 ve 12 aylık abonelik, 30 gün ücretsiz deneme.",
    url: "/fiyatlar",
  },
};

const SORULAR = [
  {
    soru: `${TRIAL_DAYS} günlük deneme bitince ne oluyor?`,
    cevap:
      "Kayıtlarınız olduğu gibi duruyor — hiçbir şey silinmiyor. Panele erişim durur ve abonelik sayfasına yönlendirilirsiniz. Ödemeniz onaylandığı anda kaldığınız yerden devam edersiniz.",
  },
  {
    soru: "Deneme için kart bilgisi gerekiyor mu?",
    cevap:
      "Hayır. Kayıt olurken kart istemiyoruz, deneme sonunda da kendiliğinden bir tahsilat olmuyor. Ödemeyi siz başlatmadan hiçbir şey çekilmez.",
  },
  {
    soru: "Ödemeyi nasıl yapıyorum?",
    cevap:
      `Havale veya EFT ile. Abonelik sayfanızda IBAN ve size özel bir referans kodu yazıyor; açıklamaya o kodu yazmanız gerekiyor, gelen ödemeyi hesabınıza bağlayan tek bilgi o. Havaleyi yaptıktan sonra ${BILLING_WHATSAPP} numarasına bildiriyorsunuz ve süreniz uzatılıyor.`,
  },
  {
    soru: "Otomatik yenileme var mı?",
    cevap:
      "Yok. Dönem bittiğinde kendiliğinden bir tahsilat yapılmaz; devam etmek isterseniz yeniden ödeme yaparsınız. İptal etmek için bir şey yapmanıza gerek yok, ödemezseniz abonelik durur.",
  },
  {
    soru: "Salon sayım fiyatı değiştirir mi?",
    cevap:
      "Hayır. Tek salonla da beş salonla da aynı bedeli ödüyorsunuz. Kullanıcı sayısı için de sınır yok; personelinizi istediğiniz kadar ekleyebilirsiniz.",
  },
  {
    soru: "Özelliklerin bir kısmı üst pakette mi?",
    cevap:
      "Hayır, kademe yok. Kârlılık raporları, sözleşme çıktısı, rol bazlı finans kısıtı dahil her şey tek pakette açık.",
  },
  {
    soru: "6 ay yerine 12 ay almak ne kazandırıyor?",
    cevap:
      `12 aylık dönemde ${BILLING_TERMS[1].paidMonths} ay ödüyorsunuz, ${FREE_MONTHS_YEARLY} ay ücretsiz — ${formatMoney(MONTHLY_PRICE * FREE_MONTHS_YEARLY)} daha az. Bir de yılda bir kez ödeme yapmış oluyorsunuz.`,
  },
];

export default function FiyatlarPage() {
  return (
    <div className="mk-scope min-h-svh">
      <SiteHeader />

      <main>
        <section className="bg-white pt-28 pb-16 lg:pt-36 lg:pb-20">
          <div className="mx-auto max-w-[1180px] px-5 sm:px-6">
            <Reveal className="mx-auto max-w-[42rem] text-center">
              <p className="text-[0.8125rem] font-semibold tracking-[0.14em] text-mk-muted uppercase">
                Fiyatlar
              </p>
              <h1 className="mk-title mt-4 text-[clamp(2rem,4vw,3rem)] text-mk-ink">
                Tek paket, her şey dahil.
              </h1>
              <p className="mt-5 text-[1.0625rem] leading-relaxed text-mk-body">
                Kademe yok, ek modül yok, salon ve kullanıcı sınırı yok.{" "}
                {TRIAL_DAYS} gün ücretsiz deneyin; kart istemiyoruz.
              </p>
            </Reveal>

            <div className="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-2">
              {BILLING_TERMS.map((term, i) => {
                const bedavaAy = term.months - term.paidMonths;
                return (
                  <Reveal key={term.id} delay={i * 90}>
                    <div
                      className={cn(
                        "relative flex h-full flex-col rounded-[24px] p-8",
                        term.featured
                          ? "bg-mk-ink text-white shadow-[0_30px_70px_-30px_rgba(11,18,32,0.55)]"
                          : "border border-mk-line bg-white",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h2
                          className={cn(
                            "text-[1.0625rem] font-semibold tracking-tight",
                            term.featured ? "text-white" : "text-mk-ink",
                          )}
                        >
                          {term.label}
                        </h2>
                        {bedavaAy > 0 && (
                          <span className="rounded-full bg-[linear-gradient(90deg,#1a5cff,#16e0b4)] px-2.5 py-1 text-[0.6875rem] font-medium text-white">
                            {bedavaAy} ay ücretsiz
                          </span>
                        )}
                      </div>

                      <p
                        className={cn(
                          "mt-5 text-[2.25rem] leading-none font-semibold tracking-tight",
                          term.featured ? "text-white" : "text-mk-ink",
                        )}
                      >
                        <span className="tabular">{formatMoney(term.price)}</span>
                      </p>

                      <p
                        className={cn(
                          "mt-3 text-[0.875rem] leading-relaxed",
                          term.featured ? "text-white/65" : "text-mk-muted",
                        )}
                      >
                        {term.days} gün ·{" "}
                        {bedavaAy > 0
                          ? `${term.paidMonths} ay ödersiniz`
                          : `ayda ${formatMoney(MONTHLY_PRICE)}`}
                      </p>

                      <ul className="mt-7 flex flex-1 flex-col gap-3">
                        {PLAN_FEATURES.map((f) => (
                          <li
                            key={f}
                            className={cn(
                              "flex gap-2.5 text-[0.9375rem] leading-relaxed",
                              term.featured ? "text-white/85" : "text-mk-body",
                            )}
                          >
                            <Check
                              className={cn(
                                "mt-1 size-3.5 shrink-0",
                                term.featured ? "text-[#16e0b4]" : "text-mk-ink",
                              )}
                              strokeWidth={3}
                            />
                            {f}
                          </li>
                        ))}
                      </ul>

                      <div className="mt-8">
                        <PillLink href="/kayit" className="w-full justify-between">
                          {TRIAL_DAYS} gün ücretsiz deneyin
                        </PillLink>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* Sayfanın asıl içeriği: anasayfada olmayan açıklamalar. */}
        <section className="border-t border-mk-line bg-mk-tint py-20 lg:py-24">
          <div className="mx-auto max-w-[1180px] px-5 sm:px-6">
            <Reveal className="max-w-[38rem]">
              <h2 className="mk-title text-[clamp(1.75rem,3vw,2.25rem)] text-mk-ink">
                Sık sorulanlar
              </h2>
              <p className="mt-4 text-[1.0625rem] leading-relaxed text-mk-body">
                Ödeme, deneme süresi ve iptal hakkında merak edilenler.
              </p>
            </Reveal>

            <dl className="mt-12 grid gap-x-10 gap-y-8 lg:grid-cols-2">
              {SORULAR.map((s, i) => (
                <Reveal key={s.soru} delay={(i % 2) * 70}>
                  <div>
                    <dt className="mk-title text-[1.0625rem] text-mk-ink">
                      {s.soru}
                    </dt>
                    <dd className="mt-2.5 text-[0.9375rem] leading-relaxed text-mk-body">
                      {s.cevap}
                    </dd>
                  </div>
                </Reveal>
              ))}
            </dl>

            <Reveal className="mt-14">
              <div className="rounded-[24px] border border-mk-line bg-white p-8 text-center">
                <p className="mk-title text-[1.25rem] text-mk-ink">
                  Aklınıza takılan başka bir şey var mı?
                </p>
                <p className="mx-auto mt-3 max-w-[34rem] text-[0.9375rem] leading-relaxed text-mk-body">
                  Firmanıza özel ihtiyaçlar, veri aktarımı ve entegrasyon için
                  doğrudan yazabilirsiniz.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <PillLink href="/kayit">
                    {TRIAL_DAYS} gün ücretsiz deneyin
                  </PillLink>
                  <a
                    href="mailto:merhaba@davetpro.com"
                    className="inline-flex items-center rounded-full border border-mk-line px-5 py-2.5 text-[0.9375rem] font-medium text-mk-ink transition-colors hover:bg-mk-soft"
                  >
                    Bize ulaşın
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
