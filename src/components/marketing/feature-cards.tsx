import { CalendarCheck, Layers, ShieldCheck, TrendingUp } from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";

const FEATURES = [
  {
    icon: CalendarCheck,
    title: "Çakışmayan takvim",
    // "Aynı güne ikinci rezervasyon açılmaz" YANLIŞTI: aynı salonda arada en az
    // bir saat varsa ikinci organizasyon açılabiliyor (0011_event_gap).
    body: "Tüm salonlar tek takvimde. Çakışan saate rezervasyon açılmaz; arka arkaya organizasyonlarda en az 1 saat boşluk şart.",
  },
  {
    icon: Layers,
    title: "Paket ve fiyatlandırma",
    body: "Menü, süsleme, orkestra… Hazır paketleri seçin, tutar kendiliğinden çıksın.",
  },
  {
    icon: ShieldCheck,
    title: "Değiştirilemez kayıt",
    body: "Tahsilat ve giderler silinmez; iptal iz bırakır. Kasa her zaman tutar.",
  },
  {
    icon: TrendingUp,
    title: "Organizasyon kârı",
    body: "Her düğünün geliri ve gideri ayrı ayrı. Hangi işin kazandırdığını görün.",
  },
];

export function FeatureCards() {
  return (
    <section id="ozellikler" className="border-y border-mk-line bg-white">
      <div className="mx-auto max-w-[1180px] px-5 sm:px-6">
        <div className="grid divide-y divide-mk-line sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <Reveal
              key={f.title}
              delay={i * 80}
              className={
                // Izgara çizgileri: kartlar arasında ince ayraç.
                "sm:border-mk-line sm:[&:nth-child(2n)]:border-l lg:[&:nth-child(2n)]:border-l lg:[&:nth-child(n+2)]:border-l sm:[&:nth-child(n+3)]:border-t lg:[&:nth-child(n+3)]:border-t-0"
              }
            >
              <div className="h-full px-0 py-9 sm:px-7">
                <f.icon className="size-6 text-mk-ink" strokeWidth={1.6} />
                <h3 className="mk-title mt-5 text-[1.0625rem] text-mk-ink">{f.title}</h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-mk-body">
                  {f.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
