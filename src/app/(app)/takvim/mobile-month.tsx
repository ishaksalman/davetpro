"use client";

import { useMemo, useState } from "react";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { tr } from "date-fns/locale";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVertical } from "@/components/layout/vertical-provider";
import { formatTime, toISODate } from "@/lib/format";
import { todayISO } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "./calendar-view";

const GUNLER = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cts", "Paz"];
const EN_FAZLA_NOKTA = 3;

/**
 * Mobil ay görünümü: nokta ızgarası + seçili günün listesi.
 *
 * NEDEN: dar ekranda ay kutusuna sığan tek şey "19:…" idi; müşteri adı hiç
 * okunmuyordu. Izgara yalnızca günün dolu olup olmadığını (ve hangi ekibin
 * olduğunu) anlatıyor, ayrıntı güne dokununca altta tam genişlikte.
 *
 * Güne dokunmak artık seçiyor, rezervasyon açmıyor: boş güne ekleme listedeki
 * düğmeden. (Eskiden kısa dokunuş doğrudan form açıyordu; yanlışlıkla
 * dokunup form açılması ve dolu günü incelemenin imkânsız olması buradan.)
 */
export function MobileMonth({
  date,
  events,
  colorOf,
  onOpen,
  onCreate,
}: {
  date: Date;
  events: CalendarEvent[];
  /** Etkinliğin nokta/şerit rengi: ekipli işte ekip, değilse mekân. */
  colorOf: (event: CalendarEvent) => string;
  onOpen: (event: CalendarEvent) => void;
  onCreate: (isoDate: string) => void;
}) {
  const sozluk = useVertical();
  const bugun = todayISO();
  const [secili, setSecili] = useState<string | null>(null);

  const gunler = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(date), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(date), { weekStartsOn: 1 }),
      }),
    [date],
  );

  const aySonu = toISODate(endOfMonth(date));
  const ayBasi = toISODate(startOfMonth(date));

  // Gün → etkinlikler (saate göre).
  const gunlukEtkinlik = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const key = toISODate(e.start);
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.start.getTime() - b.start.getTime());
    return map;
  }, [events]);

  // Seçili gün görüntülenen ayda değilse: bugün (bu aydaysa) ya da ayın ilk günü.
  // Efekt kullanmadan türetiliyor; ay değişince eski seçim kendiliğinden geçersiz.
  const etkinSecili =
    secili && secili >= ayBasi && secili <= aySonu
      ? secili
      : bugun >= ayBasi && bugun <= aySonu
        ? bugun
        : ayBasi;
  const gununIsleri = gunlukEtkinlik.get(etkinSecili) ?? [];

  return (
    <div>
      <div className="grid grid-cols-7 text-center text-[11px] text-muted-foreground">
        {GUNLER.map((g) => (
          <div key={g} className="py-1.5">
            {g}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {gunler.map((gun) => {
          const iso = toISODate(gun);
          const buAyda = iso >= ayBasi && iso <= aySonu;
          const liste = gunlukEtkinlik.get(iso) ?? [];
          const seciliMi = iso === etkinSecili;
          const bugunMu = iso === bugun;

          return (
            <button
              key={iso}
              type="button"
              onClick={() => setSecili(iso)}
              aria-pressed={seciliMi}
              aria-label={`${format(gun, "d MMMM EEEE", { locale: tr })}, ${liste.length} kayıt`}
              className={cn(
                "flex h-12 flex-col items-center justify-center gap-1 rounded-lg text-sm transition-colors",
                !buAyda && "text-muted-foreground/40",
                seciliMi ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                bugunMu && !seciliMi && "font-semibold ring-1 ring-primary/50",
              )}
            >
              <span className="tabular leading-none">{format(gun, "d")}</span>
              <span className="flex h-1.5 items-center gap-0.5">
                {liste.slice(0, EN_FAZLA_NOKTA).map((e, i) => (
                  <Dot key={i} event={e} color={colorOf(e)} onDark={seciliMi} />
                ))}
                {liste.length > EN_FAZLA_NOKTA && (
                  <span className="text-[9px] leading-none">+{liste.length - EN_FAZLA_NOKTA}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 border-t pt-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">
            {format(parseISO(etkinSecili), "d MMMM EEEE", { locale: tr })}
          </h3>
          <Button size="sm" variant="outline" onClick={() => onCreate(etkinSecili)}>
            <Plus /> Ekle
          </Button>
        </div>

        {gununIsleri.length === 0 ? (
          <p className="rounded-lg bg-muted/50 px-3 py-4 text-center text-sm text-muted-foreground">
            Bu gün {sozluk.event.singular} yok.
          </p>
        ) : (
          <ul className="space-y-2">
            {gununIsleri.map((e, i) => (
              <li key={`${e.kind}-${i}`}>
                <button
                  type="button"
                  onClick={() => onOpen(e)}
                  className="flex w-full items-stretch gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-muted/50"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "w-1 shrink-0 rounded-full",
                      e.kind !== "rezervasyon" && "opacity-60",
                    )}
                    style={{ backgroundColor: e.kind === "talep" ? "#f59e0b" : colorOf(e) }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="tabular block text-xs text-muted-foreground">
                      {saat(e)}
                      {e.kind === "opsiyon" && " · opsiyon"}
                      {e.kind === "talep" && " · talep"}
                    </span>
                    <span className="block truncate text-sm font-medium">{ad(e)}</span>
                    {altSatir(e, sozluk.usesResource) && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {altSatir(e, sozluk.usesResource)}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Dot({
  event,
  color,
  onDark,
}: {
  event: CalendarEvent;
  color: string;
  onDark: boolean;
}) {
  // Seçili günde zemin koyu: renkli nokta kaybolmasın diye açık halka.
  const halka = onDark ? "ring-1 ring-primary-foreground/70" : "";
  if (event.kind === "rezervasyon") {
    return (
      <span
        aria-hidden
        className={cn("size-1.5 rounded-full", halka)}
        style={{ backgroundColor: color }}
      />
    );
  }
  // Opsiyon ve talep: içi boş, kesinlik düşük.
  return (
    <span
      aria-hidden
      className="size-1.5 rounded-full border border-dashed"
      style={{ borderColor: event.kind === "talep" ? "#f59e0b" : color }}
    />
  );
}

function saat(e: CalendarEvent): string {
  if (e.kind === "rezervasyon") {
    return `${formatTime(e.resource.start_time)} – ${formatTime(e.resource.end_time)}`;
  }
  if (e.kind === "opsiyon") return formatTime(e.hold.start_time);
  return e.lead.all_day || !e.lead.start_time ? "Saat belirsiz" : formatTime(e.lead.start_time);
}

function ad(e: CalendarEvent): string {
  if (e.kind === "rezervasyon") return e.resource.customer?.full_name ?? "—";
  if (e.kind === "opsiyon") return e.hold.customer_name;
  return e.lead.customer_name;
}

/** Konum · ekip: işe göre hangisi doluysa. Boşsa satır çıkmıyor. */
function altSatir(e: CalendarEvent, usesResource: boolean): string {
  if (e.kind !== "rezervasyon") return e.kind === "talep" ? (e.lead.venue_name ?? "") : "";
  const r = e.resource;
  const yer = usesResource ? r.venue?.name : r.location;
  return [yer, r.team?.name].filter(Boolean).join(" · ");
}
