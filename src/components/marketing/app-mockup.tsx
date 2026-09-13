import {
  CalendarDays,
  ChartPie,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  House,
  MessagesSquare,
  Package,
  Plus,
  Receipt,
  Settings,
  Store,
  Users,
  Wallet,
} from "lucide-react";
import { BrandMark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const SIDEBAR = [
  { group: "Genel", items: [
    { label: "Dashboard", icon: House },
    { label: "Takvim", icon: CalendarDays, active: true },
    { label: "Talepler", icon: MessagesSquare },
    { label: "Rezervasyonlar", icon: Receipt },
    { label: "Müşteriler", icon: Users },
  ]},
  { group: "Finans", items: [
    { label: "Gelirler", icon: Wallet },
    { label: "Giderler", icon: Wallet },
    { label: "Raporlar", icon: ChartPie },
  ]},
  { group: "Tanımlar", items: [
    { label: "Paketler", icon: Package },
    { label: "Salonlar", icon: Store },
    { label: "Ayarlar", icon: Settings },
  ]},
];

/** Salon renkleri — uygulamadaki gibi her salon kendi rengiyle işaretleniyor. */
const KAPALI = "bg-[#6366f1] text-white";
const KIR = "bg-[#4ade80] text-[#0b2d17]";

type Gun = {
  /** Ayın günü; null ise komşu aya ait boş hücre. */
  d: number | null;
  /** Önceki/sonraki aya ait gün — soluk gösteriliyor. */
  onceki?: boolean;
  bugun?: boolean;
  /** Etkinlikler: [saat + isim, renk sınıfı]. */
  e?: [string, string][];
  /** Dolu güne sığmayan organizasyon sayısı. */
  fazla?: number;
  /** Henüz rezervasyona dönmemiş talep. */
  talep?: string;
};

/*
 * Uydurma bir eylül ayı. Gerçek müşteri adı kullanılmıyor; tanıtım sayfasında
 * gerçek kayıt göstermek hem gereksiz hem yanlış olur.
 */
const HAFTALAR: Gun[][] = [
  [
    { d: 31, onceki: true }, { d: 1 }, { d: 2 },
    { d: 3, e: [["19:00 Ahmet Erdinç", KAPALI]] },
    { d: 4 },
    { d: 5, e: [["15:00 Elif & Serkan", KAPALI], ["19:00 Reyhan & Ömer", KIR]] },
    { d: 6, e: [["19:00 Sude & Fatih", KAPALI]] },
  ],
  [
    { d: 7 }, { d: 8 }, { d: 9 }, { d: 10 },
    { d: 11, e: [["19:00 Kenan Yıldız", KIR]], fazla: 2 },
    { d: 12, e: [["19:00 Damla & Tolga", KAPALI]] },
    { d: 13, bugun: true },
  ],
  [
    { d: 14 }, { d: 15 }, { d: 16 },
    { d: 17, e: [["19:00 Reyhan & Ömer", KAPALI]] },
    { d: 18, e: [["19:00 Ahmet Erdinç", KIR]] },
    { d: 19, e: [["19:00 Damla & Tolga", KAPALI], ["19:00 Ahmet & Ayşe", KAPALI]] },
    { d: 20, e: [["19:00 Ahmet Erdinç", KIR]], talep: "19:00 Zeki Çelik" },
  ],
  [
    { d: 21 }, { d: 22 }, { d: 23 }, { d: 24 }, { d: 25 },
    { d: 26, e: [["19:00 Ahmet Erdinç", KAPALI], ["19:00 Ahmet Erdinç", KIR]] },
    { d: 27 },
  ],
  [{ d: 28 }, { d: 29 }, { d: 30 }, { d: null }, { d: null }, { d: null }, { d: null }],
];

const GUNLER = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cts", "Paz"];

/**
 * Ürünün tanıtım görseli: takvim ekranı.
 *
 * Ekran görüntüsü yerine gerçek işaretlemeyle çiziliyor — her boyutta net
 * kalıyor, sayfa açılışını yavaşlatmıyor ve arayüz değiştiğinde eskimiyor.
 * `aria-hidden`: dekoratif, ekran okuyucuya sahte bir takvim okutmanın anlamı
 * yok.
 *
 * Takvim seçildi çünkü salon sahibine ürünün ne yaptığını en hızlı anlatan
 * ekran o: renkli salon blokları doluluğu tek bakışta gösteriyor.
 */
export function AppMockup({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("relative", className)}>
      <div className="relative flex h-full overflow-hidden rounded-[22px] border border-mk-line/80 bg-white shadow-[0_28px_70px_-28px_rgba(11,18,32,0.35)]">
        {/* Kenar çubuğu */}
        <div className="hidden w-[168px] shrink-0 flex-col border-r border-mk-line bg-mk-soft sm:flex">
          <div className="flex items-center gap-2 border-b border-mk-line px-3 py-2.5">
            <BrandMark className="h-5 w-auto" />
            <span className="min-w-0">
              <span className="block truncate text-[0.75rem] font-semibold tracking-tight text-mk-ink">
                Alya Davet
              </span>
              <span className="block text-[0.625rem] text-mk-muted">DavetPro</span>
            </span>
          </div>

          <div className="flex flex-1 flex-col gap-2.5 p-2">
            {SIDEBAR.map((group) => (
              <div key={group.group}>
                <p className="px-2 pb-1 text-[0.5625rem] font-medium tracking-wide text-mk-muted uppercase">
                  {group.group}
                </p>
                <nav className="flex flex-col gap-0.5">
                  {group.items.map((item) => (
                    <span
                      key={item.label}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-2 py-[5px] text-[0.6875rem] font-medium",
                        item.active
                          ? "bg-white text-mk-ink shadow-[0_1px_2px_rgba(11,18,32,0.06)]"
                          : "text-mk-muted",
                      )}
                    >
                      <item.icon className="size-3" />
                      {item.label}
                    </span>
                  ))}
                </nav>
              </div>
            ))}
          </div>

          {/* Kullanıcı satırı — gerçek kenar çubuğunda da en altta duruyor. */}
          <div className="flex items-center gap-2 border-t border-mk-line px-3 py-2">
            <span className="flex size-6 items-center justify-center rounded-md bg-mk-ink/5 text-[0.5625rem] font-medium text-mk-muted">
              is
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[0.6875rem] font-medium text-mk-ink">
                İshak Salman
              </span>
              <span className="block text-[0.5625rem] text-mk-muted">
                İşletme Sahibi
              </span>
            </span>
          </div>
        </div>

        {/* İçerik */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="border-b border-mk-line px-4 py-2.5">
            <p className="text-[0.9375rem] font-semibold tracking-tight text-mk-ink">
              Takvim
            </p>
            <p className="mt-0.5 text-[0.6875rem] text-mk-muted">
              Boş günleri görün, boş bir güne tıklayarak rezervasyon oluşturun.
            </p>
          </div>

          <div className="min-w-0 flex-1 p-3 sm:p-4">
            {/* Üst çubuk */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="rounded-md border border-mk-line bg-white p-1 text-mk-muted">
                  <ChevronLeft className="size-3" />
                </span>
                <span className="rounded-md border border-mk-line bg-white p-1 text-mk-muted">
                  <ChevronRight className="size-3" />
                </span>
                <span className="rounded-md border border-mk-line bg-white px-2 py-1 text-[0.6875rem] font-medium text-mk-ink">
                  Bugün
                </span>
                <span className="ml-1 flex items-center gap-1 text-[0.8125rem] font-semibold text-mk-ink">
                  Eylül 2026
                  <ChevronDown className="size-3 text-mk-muted" />
                </span>
              </div>

              <div className="hidden items-center gap-1.5 md:flex">
                <span className="flex items-center gap-1 rounded-md border border-mk-line bg-white px-2 py-1 text-[0.6875rem] text-mk-muted">
                  Tüm salonlar
                  <ChevronDown className="size-3" />
                </span>
                <span className="flex items-center rounded-md bg-mk-soft p-0.5 text-[0.6875rem]">
                  <span className="rounded bg-white px-1.5 py-0.5 font-medium text-mk-ink shadow-[0_1px_2px_rgba(11,18,32,0.06)]">
                    Ay
                  </span>
                  <span className="px-1.5 py-0.5 text-mk-muted">Hafta</span>
                  <span className="px-1.5 py-0.5 text-mk-muted">Gün</span>
                </span>
                <span className="flex items-center gap-1 rounded-md bg-mk-ink px-2 py-1 text-[0.6875rem] font-medium text-white">
                  <Plus className="size-3" />
                  Yeni rezervasyon
                </span>
              </div>
            </div>

            {/* Salon ve durum açıklaması */}
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.625rem] text-mk-muted">
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-[#6366f1]" />
                Alya Kapalı Nişan Salonu
              </span>
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-[#4ade80]" />
                Alya Kır Düğün Salonu
              </span>
              <span className="hidden h-3 w-px bg-mk-line lg:block" />
              <span className="hidden items-center gap-1 lg:flex">
                <span className="h-2 w-3 rounded-sm bg-mk-muted/60" />
                Rezervasyon
              </span>
              <span className="hidden items-center gap-1 lg:flex">
                <span className="h-2 w-3 rounded-sm border border-dashed border-mk-muted/70" />
                Opsiyon
              </span>
              <span className="hidden items-center gap-1 lg:flex">
                <span className="h-2 w-3 rounded-sm border border-dashed border-amber-400" />
                Talep
              </span>
            </div>

            {/* Ay ızgarası */}
            <div className="mt-2.5 overflow-hidden rounded-xl border border-mk-line">
              <div className="grid grid-cols-7 border-b border-mk-line bg-mk-soft/60">
                {GUNLER.map((g) => (
                  <span
                    key={g}
                    className="px-1.5 py-1.5 text-center text-[0.625rem] font-medium text-mk-muted"
                  >
                    {g}
                  </span>
                ))}
              </div>

              {HAFTALAR.map((hafta, hi) => (
                <div
                  key={hi}
                  className={cn(
                    "grid grid-cols-7",
                    hi < HAFTALAR.length - 1 && "border-b border-mk-line",
                  )}
                >
                  {hafta.map((gun, gi) => (
                    <div
                      key={gi}
                      className={cn(
                        "min-h-[46px] px-1 py-1 sm:min-h-[54px]",
                        gi < 6 && "border-r border-mk-line",
                        (gun.d === null || gun.onceki) && "bg-mk-soft/50",
                        gun.bugun && "bg-mk-soft",
                      )}
                    >
                      <span
                        className={cn(
                          "block text-right text-[0.625rem] leading-none",
                          gun.bugun
                            ? "font-semibold text-mk-ink"
                            : gun.d === null || gun.onceki
                              ? "text-mk-muted/50"
                              : "text-mk-muted",
                        )}
                      >
                        {gun.d ?? ""}
                      </span>

                      <span className="mt-1 flex flex-col gap-0.5">
                        {/* Dar ekranda metin "19:…" diye kırpılıp okunmaz
                            hale geliyordu; renkli çubuk doluluğu zaten
                            anlatıyor. */}
                        {gun.e?.map(([metin, renk], i) => (
                          <span
                            key={i}
                            className={cn(
                              "h-1.5 truncate rounded px-1 text-[0.5625rem] leading-tight font-medium sm:h-auto sm:py-[2px]",
                              renk,
                            )}
                          >
                            <span className="hidden sm:inline">{metin}</span>
                          </span>
                        ))}
                        {gun.talep && (
                          <span className="h-1.5 truncate rounded border border-dashed border-amber-400 bg-white px-1 text-[0.5625rem] leading-tight font-medium text-mk-ink sm:h-auto sm:py-[2px]">
                            <span className="hidden sm:inline">{gun.talep}</span>
                          </span>
                        )}
                        {gun.fazla && (
                          <span className="hidden px-1 text-[0.5625rem] leading-tight text-mk-muted sm:block">
                            +{gun.fazla} organizasyon
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
