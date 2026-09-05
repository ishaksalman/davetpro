import {
  CalendarDays,
  ChartPie,
  House,
  Receipt,
  Search,
  Users,
  Wallet,
} from "lucide-react";
import { BrandMark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const SIDEBAR = [
  { label: "Panel", icon: House, active: true },
  { label: "Takvim", icon: CalendarDays },
  { label: "Rezervasyonlar", icon: Receipt },
  { label: "Müşteriler", icon: Users },
  { label: "Gelirler", icon: Wallet },
  { label: "Raporlar", icon: ChartPie },
];

/** Aylık tahsilat sütunları — son ay vurgulu. */
const BARS = [38, 52, 46, 64, 58, 79, 92];
const MONTHS = ["Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl"];

const UPCOMING = [
  { name: "Yılmaz — Düğün", date: "12.09.2026", venue: "Kristal Salon", tone: "mint" },
  { name: "Demir — Nişan", date: "19.09.2026", venue: "Bahçe", tone: "blue" },
  { name: "Kaya — Kına", date: "26.09.2026", venue: "Kristal Salon", tone: "amber" },
];

/**
 * Ürünün tanıtım görseli. Ekran görüntüsü yerine gerçek işaretlemeyle
 * çiziliyor: her ekran boyutunda net kalıyor ve metinler seçilebilir olmuyor
 * diye `aria-hidden` ile erişilebilirlik ağacından çıkarılıyor.
 */
export function AppMockup({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("relative", className)}>
      <div className="relative flex h-full overflow-hidden rounded-[22px] border border-mk-line/80 bg-white shadow-[0_28px_70px_-28px_rgba(11,18,32,0.35)]">
        {/* Kenar çubuğu */}
        <div className="hidden w-[188px] shrink-0 flex-col border-r border-mk-line bg-mk-soft p-3 sm:flex">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <BrandMark className="h-5 w-auto" />
            <span className="text-[0.8125rem] font-semibold tracking-tight text-mk-ink">
              DavetPro
            </span>
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-lg border border-mk-line bg-white px-2.5 py-2">
            <Search className="size-3.5 text-mk-muted" />
            <span className="text-[0.6875rem] text-mk-muted">Ara…</span>
          </div>

          <p className="mt-4 px-2 text-[0.625rem] font-medium tracking-wide text-mk-muted uppercase">
            Menü
          </p>
          <nav className="mt-1.5 flex flex-col gap-0.5">
            {SIDEBAR.map((item) => (
              <span
                key={item.label}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2.5 py-[7px] text-[0.75rem] font-medium",
                  item.active
                    ? "bg-white text-mk-ink shadow-[0_1px_2px_rgba(11,18,32,0.06)]"
                    : "text-mk-muted",
                )}
              >
                <item.icon className="size-3.5" />
                {item.label}
              </span>
            ))}
          </nav>
        </div>

        {/* İçerik */}
        <div className="min-w-0 flex-1 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[0.9375rem] font-semibold tracking-tight text-mk-ink">
                Panel
              </p>
              <p className="mt-0.5 text-[0.6875rem] text-mk-muted">Eylül 2026</p>
            </div>
            <span className="rounded-full bg-mk-ink px-3 py-1.5 text-[0.6875rem] font-medium text-white">
              Yeni rezervasyon
            </span>
          </div>

          {/* Özet kartları */}
          <div className="mt-4 grid grid-cols-3 gap-2.5">
            <StatTile label="Bu ay tahsilat" value="₺486.500" delta="+12,4%" up />
            <StatTile label="Bekleyen kapora" value="₺74.000" delta="6 kayıt" />
            <StatTile label="Doluluk" value="%78" delta="+4 gün" up />
          </div>

          {/* Grafik */}
          <div className="mt-2.5 rounded-xl border border-mk-line bg-white p-3.5">
            <div className="flex items-baseline justify-between">
              <p className="text-[0.75rem] font-medium text-mk-ink">Nakit akışı</p>
              <p className="text-[0.625rem] text-mk-muted">Son 7 ay</p>
            </div>
            {/* Sütun yükseklikleri yüzde; bu yüzden satırın yüksekliği kesin
                olmalı ve etiketler ayrı bir satırda durmalı. */}
            <div className="mt-3 flex h-[68px] items-end gap-2">
              {BARS.map((h, i) => (
                <div
                  key={MONTHS[i]}
                  style={{ height: `${h}%` }}
                  className={cn(
                    "flex-1 rounded-[3px]",
                    i === BARS.length - 1
                      ? "bg-[linear-gradient(180deg,#0fbfd8,#16e0b4)]"
                      : "bg-mk-line",
                  )}
                />
              ))}
            </div>
            <div className="mt-1.5 flex gap-2">
              {MONTHS.map((m) => (
                <span
                  key={m}
                  className="flex-1 text-center text-[0.5625rem] text-mk-muted"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>

          {/* Yaklaşan organizasyonlar */}
          <div className="mt-2.5 hidden rounded-xl border border-mk-line bg-white p-3.5 md:block">
            <p className="text-[0.75rem] font-medium text-mk-ink">Yaklaşan organizasyonlar</p>
            <div className="mt-2 flex flex-col gap-1.5">
              {UPCOMING.map((row) => (
                <div key={row.name} className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "size-1.5 shrink-0 rounded-full",
                      row.tone === "mint" && "bg-[#16e0b4]",
                      row.tone === "blue" && "bg-[#1a5cff]",
                      row.tone === "amber" && "bg-[#f0b429]",
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate text-[0.6875rem] font-medium text-mk-ink">
                    {row.name}
                  </span>
                  <span className="hidden text-[0.625rem] text-mk-muted lg:block">
                    {row.venue}
                  </span>
                  <span className="tabular text-[0.625rem] text-mk-muted">{row.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  delta,
  up = false,
}: {
  label: string;
  value: string;
  delta: string;
  up?: boolean;
}) {
  return (
    <div className="rounded-xl border border-mk-line bg-white p-2.5">
      <p className="truncate text-[0.625rem] text-mk-muted">{label}</p>
      <p className="tabular mt-1 text-[0.9375rem] font-semibold tracking-tight text-mk-ink">
        {value}
      </p>
      <p
        className={cn(
          "mt-0.5 text-[0.5625rem] font-medium",
          up ? "text-[#0d9b74]" : "text-mk-muted",
        )}
      >
        {delta}
      </p>
    </div>
  );
}
