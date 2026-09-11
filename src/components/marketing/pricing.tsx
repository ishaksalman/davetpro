import { Check } from "lucide-react";
import { PillLink } from "@/components/marketing/site-header";
import { Reveal } from "@/components/marketing/reveal";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import {
  BILLING_PACKAGES,
  FREE_MONTHS_YEARLY,
  TRIAL_DAYS,
} from "@/lib/subscription";

/**
 * Fiyatlar BILLING_PACKAGES'tan geliyor; uygulama içindeki abonelik sayfası da
 * aynı listeyi kullanıyor. İki yerde ayrı yazılsaydı biri güncellenmeyip
 * müşteriye iki farklı rakam gösterilebilirdi — bir süre öyle oldu.
 */
const fiyat = (id: string) => {
  const paket = BILLING_PACKAGES.find((p) => p.id === id);
  return paket ? formatMoney(paket.monthlyPrice) : "—";
};

const PLANS = [
  {
    name: "Tek Salon",
    price: fiyat("tek_salon"),
    note: "Tek salonu olan işletmeler için.",
    features: [
      "1 salon, 3 kullanıcı",
      "Takvim ve rezervasyon",
      "Tahsilat ve ödeme planı",
      "Sözleşme ve teklif çıktısı",
    ],
    cta: "Ücretsiz deneyin",
  },
  {
    name: "Çoklu Salon",
    price: fiyat("coklu_salon"),
    note: "Birden fazla salon ve bahçe işletenler için.",
    featured: true,
    features: [
      "Sınırsız salon, 10 kullanıcı",
      "Tek Salon'daki her şey",
      "Organizasyon bazlı kârlılık",
      "Gider kategorileri ve raporlar",
      "Rol bazlı finans kısıtı",
    ],
    cta: "Ücretsiz deneyin",
  },
  {
    name: "Kurumsal",
    price: "Teklif",
    note: "Zincir işletmeler ve özel ihtiyaçlar için.",
    features: [
      "Sınırsız kullanıcı",
      "Çoklu Salon'daki her şey",
      "Veri aktarımı ve kurulum desteği",
      "Öncelikli destek hattı",
    ],
    cta: "Bize ulaşın",
    href: "mailto:merhaba@davetpro.com",
  },
];

export function Pricing() {
  return (
    <section id="fiyatlar" className="bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-[1180px] px-5 sm:px-6">
        <Reveal className="mx-auto max-w-[38rem] text-center">
          <p className="text-[0.8125rem] font-semibold tracking-[0.14em] text-mk-muted uppercase">
            Fiyatlar
          </p>
          <h2 className="mk-title mt-4 text-[clamp(1.9rem,3.6vw,2.75rem)] text-mk-ink">
            Bir düğünün kaporasından az.
          </h2>
          <p className="mt-5 text-[1.0625rem] leading-relaxed text-mk-body">
            {TRIAL_DAYS} gün ücretsiz deneyin, kart istemiyoruz. Aylık, KDV
            hariç fiyatlardır; yıllık ödemede {FREE_MONTHS_YEARLY} ay ücretsiz.
            İstediğiniz zaman iptal edebilirsiniz.
          </p>
        </Reveal>

        <div className="mt-14 grid items-start gap-4 lg:grid-cols-3">
          {PLANS.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 90}>
              <div
                className={cn(
                  "flex h-full flex-col rounded-[24px] p-8",
                  plan.featured
                    ? "bg-mk-ink text-white shadow-[0_30px_70px_-30px_rgba(11,18,32,0.55)]"
                    : "border border-mk-line bg-white",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3
                    className={cn(
                      "text-[1.0625rem] font-semibold tracking-tight",
                      plan.featured ? "text-white" : "text-mk-ink",
                    )}
                  >
                    {plan.name}
                  </h3>
                  {plan.featured && (
                    <span className="rounded-full bg-[linear-gradient(90deg,#1a5cff,#16e0b4)] px-2.5 py-1 text-[0.6875rem] font-medium text-white">
                      En çok seçilen
                    </span>
                  )}
                </div>

                <p
                  className={cn(
                    "mt-5 text-[2.25rem] leading-none font-semibold tracking-tight",
                    plan.featured ? "text-white" : "text-mk-ink",
                  )}
                >
                  <span className="tabular">{plan.price}</span>
                  {plan.price !== "Teklif" && (
                    <span
                      className={cn(
                        "text-[0.875rem] font-normal",
                        plan.featured ? "text-white/60" : "text-mk-muted",
                      )}
                    >
                      {" "}
                      / ay
                    </span>
                  )}
                </p>

                <p
                  className={cn(
                    "mt-3 text-[0.875rem] leading-relaxed",
                    plan.featured ? "text-white/65" : "text-mk-muted",
                  )}
                >
                  {plan.note}
                </p>

                <ul className="mt-7 flex flex-1 flex-col gap-3">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className={cn(
                        "flex gap-2.5 text-[0.9375rem] leading-relaxed",
                        plan.featured ? "text-white/85" : "text-mk-body",
                      )}
                    >
                      <Check
                        className={cn(
                          "mt-1 size-3.5 shrink-0",
                          plan.featured ? "text-[#16e0b4]" : "text-mk-ink",
                        )}
                        strokeWidth={3}
                      />
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="mt-8">
                  <PillLink
                    href={plan.href ?? "/kayit"}
                    className={cn("w-full justify-between", !plan.featured && "sm:w-auto")}
                  >
                    {plan.cta}
                  </PillLink>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
