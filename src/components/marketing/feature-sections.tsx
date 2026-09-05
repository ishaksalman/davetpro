import { Check } from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";
import { cn } from "@/lib/utils";

/**
 * Referans tasarımdaki üç sıralı anlatım bloğu: bir yanda başlık + madde
 * listesi, diğer yanda o özelliğe ait arayüz parçası. Bloklar sırayla yön
 * değiştirir (`flip`).
 */
function FeatureSection({
  eyebrow,
  title,
  body,
  points,
  visual,
  flip = false,
  tinted = false,
}: {
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
  visual: React.ReactNode;
  flip?: boolean;
  tinted?: boolean;
}) {
  return (
    <section className={cn("py-20 lg:py-28", tinted ? "bg-mk-tint" : "bg-white")}>
      <div className="mx-auto max-w-[1180px] px-5 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <Reveal className={cn(flip && "lg:order-2")}>
            <p className="text-[0.8125rem] font-semibold tracking-[0.14em] text-mk-muted uppercase">
              {eyebrow}
            </p>
            <h2 className="mk-title mt-4 text-[clamp(1.9rem,3.4vw,2.5rem)] text-mk-ink">
              {title}
            </h2>
            <p className="mt-5 max-w-[32rem] text-[1.0625rem] leading-relaxed text-mk-body">
              {body}
            </p>
            <ul className="mt-7 flex flex-col gap-3.5">
              {points.map((p) => (
                <li key={p} className="flex gap-3 text-[0.9375rem] leading-relaxed text-mk-body">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-mk-ink">
                    <Check className="size-3 text-white" strokeWidth={3} />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={100} className={cn(flip && "lg:order-1")}>
            {visual}
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- görseller */

const CARD =
  "rounded-2xl border border-mk-line bg-white p-5 shadow-[0_18px_44px_-24px_rgba(11,18,32,0.28)]";

/** Ay görünümü — dolu günler marka renginde, seçili gün vurgulu. */
function CalendarVisual() {
  const booked = new Set([5, 6, 12, 13, 19, 20, 26]);
  const pending = new Set([9, 22]);
  const days = Array.from({ length: 30 }, (_, i) => i + 1);

  return (
    <div aria-hidden className={CARD}>
      <div className="flex items-baseline justify-between">
        <p className="text-[0.9375rem] font-semibold tracking-tight text-mk-ink">Eylül 2026</p>
        <p className="text-[0.75rem] text-mk-muted">Kristal Salon</p>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"].map((d) => (
          <span key={d} className="pb-1 text-center text-[0.6875rem] text-mk-muted">
            {d}
          </span>
        ))}
        {days.map((d) => (
          <span
            key={d}
            className={cn(
              "tabular grid aspect-square place-items-center rounded-lg text-[0.75rem] font-medium",
              booked.has(d)
                ? "bg-[linear-gradient(135deg,#1a5cff,#0fbfd8)] text-white"
                : pending.has(d)
                  ? "border border-[#f0b429]/50 bg-[#f0b429]/10 text-[#946200]"
                  : "bg-mk-tint text-mk-body",
            )}
          >
            {d}
          </span>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 border-t border-mk-line pt-3.5 text-[0.75rem] text-mk-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[linear-gradient(135deg,#1a5cff,#0fbfd8)]" />
          Dolu
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full border border-[#f0b429]/60 bg-[#f0b429]/25" />
          Opsiyonlu
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-mk-tint ring-1 ring-mk-line ring-inset" />
          Boş
        </span>
      </div>
    </div>
  );
}

/** Ödeme planı — kapora, ara ödeme, kalan tutar. */
function PaymentVisual() {
  const rows = [
    { label: "Kapora", date: "04.03.2026", amount: "₺60.000", done: true },
    { label: "1. ara ödeme", date: "18.06.2026", amount: "₺80.000", done: true },
    { label: "2. ara ödeme", date: "20.08.2026", amount: "₺60.000", done: false },
  ];

  return (
    <div aria-hidden className={CARD}>
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-[0.9375rem] font-semibold tracking-tight text-mk-ink">
            Yılmaz — Düğün
          </p>
          <p className="mt-0.5 text-[0.75rem] text-mk-muted">12.09.2026 · 420 kişi</p>
        </div>
        <span className="rounded-full bg-[#16e0b4]/15 px-2.5 py-1 text-[0.6875rem] font-medium text-[#0a7d61]">
          Onaylandı
        </span>
      </div>

      <div className="mt-5 rounded-xl bg-mk-tint p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-[0.75rem] text-mk-body">Tahsil edilen</p>
          <p className="tabular text-[0.75rem] text-mk-muted">₺140.000 / ₺260.000</p>
        </div>
        <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-white">
          <div
            style={{ width: "54%" }}
            className="h-full rounded-full bg-[linear-gradient(90deg,#1a5cff,#0fbfd8,#16e0b4)]"
          />
        </div>
        <p className="tabular mt-3 text-[1.375rem] font-semibold tracking-tight text-mk-ink">
          ₺120.000{" "}
          <span className="text-[0.75rem] font-normal text-mk-muted">kalan</span>
        </p>
      </div>

      <div className="mt-4 flex flex-col divide-y divide-mk-line">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-3 py-2.5">
            <span
              className={cn(
                "grid size-5 shrink-0 place-items-center rounded-full",
                r.done ? "bg-[#16e0b4]" : "border border-dashed border-mk-line bg-white",
              )}
            >
              {r.done && <Check className="size-3 text-white" strokeWidth={3} />}
            </span>
            <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium text-mk-ink">
              {r.label}
            </span>
            <span className="tabular text-[0.75rem] text-mk-muted">{r.date}</span>
            <span className="tabular w-[4.5rem] text-right text-[0.8125rem] font-semibold text-mk-ink">
              {r.amount}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Kârlılık kırılımı — gelir, gider ve kalan kâr. */
function ProfitVisual() {
  const costs = [
    { label: "Menü / ikram", value: 92_000, pct: 62 },
    { label: "Süsleme", value: 24_000, pct: 16 },
    { label: "Orkestra", value: 18_000, pct: 12 },
    { label: "Personel", value: 14_500, pct: 10 },
  ];

  return (
    <div aria-hidden className={CARD}>
      <div className="flex items-baseline justify-between">
        <p className="text-[0.9375rem] font-semibold tracking-tight text-mk-ink">
          Organizasyon kârlılığı
        </p>
        <p className="text-[0.75rem] text-mk-muted">Eylül 2026</p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2.5">
        {[
          { l: "Gelir", v: "₺260.000", c: "text-mk-ink" },
          { l: "Gider", v: "₺148.500", c: "text-[#c2410c]" },
          { l: "Kâr", v: "₺111.500", c: "text-[#0a7d61]" },
        ].map((s) => (
          <div key={s.l} className="rounded-xl bg-mk-tint p-3">
            <p className="text-[0.6875rem] text-mk-muted">{s.l}</p>
            <p className={cn("tabular mt-1 text-[0.9375rem] font-semibold tracking-tight", s.c)}>
              {s.v}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-5 text-[0.75rem] font-medium text-mk-body">Gider kırılımı</p>
      <div className="mt-3 flex flex-col gap-3">
        {costs.map((c, i) => (
          <div key={c.label}>
            <div className="flex items-baseline justify-between text-[0.75rem]">
              <span className="text-mk-body">{c.label}</span>
              <span className="tabular font-medium text-mk-ink">
                ₺{c.value.toLocaleString("tr-TR")}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-mk-tint">
              <div
                style={{
                  width: `${c.pct}%`,
                  background: ["#1a5cff", "#0fbfd8", "#16e0b4", "#94a3b8"][i],
                }}
                className="h-full rounded-full"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-baseline justify-between border-t border-mk-line pt-3.5">
        <span className="text-[0.75rem] text-mk-body">Kâr marjı</span>
        <span className="tabular text-[1.125rem] font-semibold tracking-tight text-[#0a7d61]">
          %42,9
        </span>
      </div>
    </div>
  );
}

export function FeatureSections() {
  return (
    <div id="nasil-calisir">
      <FeatureSection
        eyebrow="Takvim"
        title="Boş tarihi telefonda, bir bakışta söyleyin."
        body="Tüm salonlarınız tek takvimde. Müşteri ararken tarihi açıp opsiyon verin; çakışma olduğunda sistem kaydı almaz."
        points={[
          "Salon bazında ay, hafta ve gün görünümü",
          "Opsiyonlu tarihler için süre sonu uyarısı",
          "Aynı güne ikinci rezervasyon veritabanı düzeyinde engellenir",
        ]}
        visual={<CalendarVisual />}
      />

      <FeatureSection
        flip
        tinted
        eyebrow="Tahsilat"
        title="Kapora, ara ödeme ve kalan tutar kendiliğinden."
        body="Ödeme planını bir kez kurun. Her tahsilatta kalan tutar güncellensin, yaklaşan ödemeler panelde beklesin."
        points={[
          "Nakit, havale, kart ve senet ayrı ayrı izlenir",
          "Girilen tahsilat silinemez; iptal gerekçesiyle birlikte iz bırakır",
          "Sözleşme ve teklif çıktısı tek tıkla yazdırılır",
        ]}
        visual={<PaymentVisual />}
      />

      <FeatureSection
        eyebrow="Kârlılık"
        title="Hangi organizasyonun kazandırdığını görün."
        body="Gelir organizasyon tarihine, tahsilat ve gider işlem tarihine göre işlenir. Kârlılık ile nakit akışı birbirine karışmaz."
        points={[
          "Her organizasyonun geliri ve gideri ayrı hesaplanır",
          "Gider kalemleri kategoriye göre kırılır",
          "Aylık nakit akışı ve doluluk raporu hazır gelir",
        ]}
        visual={<ProfitVisual />}
      />
    </div>
  );
}
