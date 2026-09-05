"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  dateFnsLocalizer,
  Views,
  type SlotInfo,
  type View,
} from "react-big-calendar";
import {
  endOfDay,
  endOfWeek,
  format,
  getDay,
  parse,
  startOfWeek,
} from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronDown, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ORGANIZATION_TYPE_LABELS } from "@/lib/constants";
import { formatMonth, formatTime, toISODate } from "@/lib/format";
import type {
  Customer,
  LeadStatus,
  Package,
  Venue,
} from "@/lib/database.types";
import type { ReservationRow } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { ReservationFormDialog } from "../rezervasyonlar/reservation-form-dialog";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales: { tr },
});

const MESSAGES = {
  today: "Bugün",
  previous: "Önceki",
  next: "Sonraki",
  month: "Ay",
  week: "Hafta",
  day: "Gün",
  agenda: "Ajanda",
  date: "Tarih",
  time: "Saat",
  event: "Organizasyon",
  noEventsInRange: "Bu aralıkta organizasyon yok.",
  showMore: (count: number) => `+${count} organizasyon`,
};

const VIEW_LABELS: Record<string, string> = {
  [Views.MONTH]: "Ay",
  [Views.WEEK]: "Hafta",
  [Views.DAY]: "Gün",
};

/**
 * Takvim iki tür kayıt gösterir: kesin rezervasyonlar ve aktif opsiyonlar.
 * Opsiyon salonu geçici olarak tutar, bu yüzden görsel olarak ayrışıyor —
 * kesikli çerçeve ve solgun zemin.
 */
type CalendarEvent = {
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
} & (
  | { kind: "rezervasyon"; resource: ReservationRow }
  | { kind: "opsiyon"; hold: CalendarHold }
  | { kind: "talep"; lead: CalendarLead }
);

/** Açık talep: salonu bloke etmez, takvimde yalnızca bilgi olarak durur. */
export type CalendarLead = {
  id: string;
  venue_id: string | null;
  venue_name: string | null;
  venue_color: string | null;
  event_date: string;
  start_time: string | null;
  all_day: boolean;
  starts_at: string;
  ends_at: string;
  customer_name: string;
  status: LeadStatus;
};

export type CalendarHold = {
  id: string;
  lead_id: string;
  venue_id: string;
  event_date: string;
  start_time: string;
  starts_at: string;
  ends_at: string;
  expires_at: string;
  customer_name: string;
  venue_color: string;
};

export function CalendarView({
  reservations,
  holds,
  leads,
  customers,
  venues,
  packages,
  showFinance,
}: {
  reservations: ReservationRow[];
  holds: CalendarHold[];
  leads: CalendarLead[];
  customers: Customer[];
  venues: Venue[];
  packages: Package[];
  showFinance: boolean;
}) {
  const router = useRouter();
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [venueId, setVenueId] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [slotDefaults, setSlotDefaults] = useState<{
    event_date?: string;
    venue_id?: string;
    start_time?: string;
    end_time?: string;
  }>({});

  const visible = useMemo(
    () =>
      reservations.filter(
        (r) =>
          r.status !== "iptal_edildi" &&
          (venueId === "all" || r.venue_id === venueId),
      ),
    [reservations, venueId],
  );

  const visibleHolds = useMemo(
    () => holds.filter((h) => venueId === "all" || h.venue_id === venueId),
    [holds, venueId],
  );

  // Salonu belirsiz talepler "tüm salonlar" görünümünde kalır; bir salon
  // seçildiğinde yalnızca o salona ait olanlar gösterilir.
  const visibleLeads = useMemo(
    () => leads.filter((l) => venueId === "all" || l.venue_id === venueId),
    [leads, venueId],
  );

  const events = useMemo<CalendarEvent[]>(
    () => [
      ...visible.map<CalendarEvent>((r) => {
        // starts_at/ends_at veritabanında yerel saat olarak üretilir; "Z" eklemeden
        // parse edilmeli, aksi halde saat dilimi kayması olur.
        const start = new Date(r.starts_at.replace(" ", "T"));
        const end = new Date(r.ends_at.replace(" ", "T"));

        return {
          kind: "rezervasyon" as const,
          start,
          // Ay görünümünde gece yarısını aşan bir düğün iki güne yayılmış gibi
          // görünmesin — organizasyon başladığı güne ait sayılır.
          end: view === Views.MONTH ? endOfDay(start) : end,
          title: `${r.customer?.full_name ?? "—"} · ${ORGANIZATION_TYPE_LABELS[r.organization_type]}`,
          resource: r,
        };
      }),
      ...visibleLeads.map<CalendarEvent>((l) => {
        const start = new Date(l.starts_at.replace(" ", "T"));
        const end = new Date(l.ends_at.replace(" ", "T"));
        return {
          kind: "talep" as const,
          start,
          end: view === Views.MONTH ? endOfDay(start) : end,
          allDay: l.all_day && view !== Views.MONTH,
          title: `${l.customer_name} · Talep`,
          lead: l,
        };
      }),
      ...visibleHolds.map<CalendarEvent>((h) => {
        const start = new Date(h.starts_at.replace(" ", "T"));
        const end = new Date(h.ends_at.replace(" ", "T"));
        return {
          kind: "opsiyon" as const,
          start,
          end: view === Views.MONTH ? endOfDay(start) : end,
          title: `${h.customer_name} · Opsiyon`,
          hold: h,
        };
      }),
    ],
    [visible, visibleHolds, visibleLeads, view],
  );

  const periodLabel = useMemo(() => {
    if (view === Views.DAY)
      return format(date, "d MMMM yyyy EEEE", { locale: tr });
    if (view === Views.WEEK) {
      const start = startOfWeek(date, { weekStartsOn: 1 });
      const end = endOfWeek(date, { weekStartsOn: 1 });
      const sameMonth = start.getMonth() === end.getMonth();
      return `${format(start, sameMonth ? "d" : "d MMM", { locale: tr })} – ${format(end, "d MMMM yyyy", { locale: tr })}`;
    }
    return formatMonth(date);
  }, [view, date]);

  // Boş günleri CSS'e bildirmek için: yalnızca bu günlerde "+" ipucu çıkar.
  const busyDates = useMemo(
    () =>
      new Set([
        ...visible.map((r) => r.event_date),
        ...visibleHolds.map((h) => h.event_date),
        ...visibleLeads.map((l) => l.event_date),
      ]),
    [visible, visibleHolds, visibleLeads],
  );

  function openQuickCreate(slot: SlotInfo) {
    const start = slot.start as Date;
    const end = slot.end as Date;
    const isAllDay = view === Views.MONTH;

    setSlotDefaults({
      event_date: toISODate(start),
      venue_id: venueId === "all" ? undefined : venueId,
      start_time: isAllDay ? "19:00" : format(start, "HH:mm"),
      end_time: isAllDay ? "23:00" : format(end, "HH:mm"),
    });
    setDialogOpen(true);
  }

  return (
    <div className="space-y-4">
      {/* Kendi araç çubuğumuz — react-big-calendar'ın varsayılanı kapalı.

          Mobilde altı kontrol tek satıra sığmıyor (yaklaşık 590px gerekiyor,
          ekran 375px). Üç satıra sarmak yerine iki satıra bölünüyor:
          gezinme + dönem + ekleme üstte, filtre + görünüm altta. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {/* sm:contents — geniş ekranda sarmalayıcılar kaybolup tüm kontroller
            tek satıra diziliyor, DOM sırası değişmiyor. */}
        <div className="flex items-center gap-2 sm:contents">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setDate(shift(date, view, -1))}
              aria-label="Önceki"
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setDate(shift(date, view, 1))}
              aria-label="Sonraki"
            >
              <ChevronRight />
            </Button>
            <Button variant="outline" onClick={() => setDate(new Date())}>
              Bugün
            </Button>
          </div>

          <PeriodJump date={date} onPick={setDate} label={periodLabel} />
        </div>

        {/* Satır 2 (mobil): salon filtresi, görünüm ve ekleme */}
        <div className="flex items-center gap-2 sm:contents">
          <div className="flex items-center gap-2 sm:ml-auto">
            {venues.length > 1 && (
              <Select value={venueId} onValueChange={setVenueId}>
                <SelectTrigger
                  className="min-w-0 flex-1 sm:w-40 sm:flex-none"
                  aria-label="Salon filtresi"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm salonlar</SelectItem>
                  {venues.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      <span
                        aria-hidden
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: v.color }}
                      />
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="flex rounded-lg border p-0.5">
              {[Views.MONTH, Views.WEEK, Views.DAY].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v as View)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm transition-colors",
                    view === v
                      ? "bg-secondary font-medium text-secondary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {VIEW_LABELS[v]}
                </button>
              ))}
            </div>

            <Button
              onClick={() => {
                setSlotDefaults({
                  event_date: toISODate(date),
                  venue_id: venueId === "all" ? undefined : venueId,
                });
                setDialogOpen(true);
              }}
            >
              <Plus />
              <span className="hidden sm:inline">Yeni rezervasyon</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Salon renkleri ve kayıt türleri */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {venues.length > 1 &&
          venues.map((v) => (
            <span key={v.id} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="size-2.5 rounded-full"
                style={{ backgroundColor: v.color }}
              />
              {v.name}
            </span>
          ))}

        {venues.length > 1 && (
          <span aria-hidden className="h-3.5 w-px bg-border" />
        )}

        {/* Dolgu ne kadar belirginse kayıt o kadar kesin. */}
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-2.5 w-4 rounded-sm bg-muted-foreground/70"
          />
          Rezervasyon
        </span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-2.5 w-4 rounded-sm border border-dashed border-muted-foreground/70 bg-muted-foreground/10"
          />
          Opsiyon
        </span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-2.5 w-4 rounded-sm border border-dashed border-amber-500 bg-card"
          />
          Talep
        </span>
      </div>

      <div className="rounded-xl border bg-card p-2 sm:p-4">
        <Calendar<CalendarEvent>
          localizer={localizer}
          culture="tr"
          events={events}
          date={date}
          view={view}
          onNavigate={setDate}
          onView={setView}
          views={[Views.MONTH, Views.WEEK, Views.DAY]}
          messages={MESSAGES}
          toolbar={false}
          selectable
          popup
          onSelectSlot={openQuickCreate}
          onSelectEvent={(event) =>
            router.push(
              event.kind === "opsiyon"
                ? `/talepler/${event.hold.lead_id}`
                : event.kind === "talep"
                  ? `/talepler/${event.lead.id}`
                  : `/rezervasyonlar/${event.resource.id}`,
            )
          }
          dayPropGetter={(date) =>
            busyDates.has(toISODate(date)) ? {} : { className: "rbc-day-free" }
          }
          eventPropGetter={(event) => {
            // Görsel hiyerarşi kesinliği anlatıyor: rezervasyon dolu renk,
            // opsiyon salon renginde kesikli, talep sarı kesikli ve zeminsiz.
            if (event.kind === "talep") {
              return {
                style: {
                  backgroundColor: "var(--card)",
                  border: "1.5px dashed var(--color-amber-500)",
                  color: "var(--foreground)",
                },
              };
            }
            if (event.kind === "opsiyon") {
              return {
                style: {
                  backgroundColor: `color-mix(in oklab, ${event.hold.venue_color} 14%, transparent)`,
                  border: `1.5px dashed ${event.hold.venue_color}`,
                  color: "var(--foreground)",
                },
              };
            }
            return {
              style: {
                backgroundColor:
                  event.resource.venue?.color ?? "var(--primary)",
                borderColor: "transparent",
              },
            };
          }}
          formats={{
            dateFormat: "d",
            weekdayFormat: (date) => format(date, "EEE", { locale: tr }),
            dayFormat: (date) => format(date, "d EEE", { locale: tr }),
            timeGutterFormat: (date) => format(date, "HH:mm"),
            eventTimeRangeFormat: ({ start, end }) =>
              `${format(start, "HH:mm")} – ${format(end, "HH:mm")}`,
          }}
          dayLayoutAlgorithm="no-overlap"
          step={30}
          timeslots={2}
          min={new Date(1970, 0, 1, 8, 0)}
          style={{ height: "clamp(30rem, 68svh, 52rem)" }}
          components={{
            event: ({ event }) =>
              event.kind === "talep" ? (
                <span className="block truncate">
                  <span className="font-medium">
                    {event.lead.all_day
                      ? "Talep"
                      : formatTime(event.lead.start_time!)}
                  </span>{" "}
                  {event.lead.customer_name}
                </span>
              ) : event.kind === "opsiyon" ? (
                <span className="block truncate italic">
                  <span className="font-medium">
                    {formatTime(event.hold.start_time)}
                  </span>{" "}
                  {event.hold.customer_name} · opsiyon
                </span>
              ) : (
                <span className="block truncate">
                  <span className="font-medium">
                    {formatTime(event.resource.start_time)}
                  </span>{" "}
                  {event.resource.customer?.full_name ?? "—"}
                </span>
              ),
          }}
        />
      </div>

      <ReservationFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaults={slotDefaults}
        customers={customers}
        venues={venues}
        packages={packages}
        showFinance={showFinance}
      />
    </div>
  );
}

/** Görünüme göre bir birim ileri/geri. */
function shift(date: Date, view: View, direction: 1 | -1): Date {
  const next = new Date(date);
  if (view === Views.MONTH) next.setMonth(next.getMonth() + direction);
  else if (view === Views.WEEK) next.setDate(next.getDate() + 7 * direction);
  else next.setDate(next.getDate() + direction);
  return next;
}

const AY_ADLARI = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

/**
 * Dönem etiketi aynı zamanda atlama denetimi.
 *
 * Oklarla gezinmek yalnızca komşu döneme gitmek için işe yarıyordu; düğün
 * salonları bir-iki yıl öncesinden rezervasyon aldığı için 12+ tıklama
 * gerekiyordu. Etikete basınca yıl seçilip ay doğrudan tıklanabiliyor.
 *
 * Ayrı bir düğme eklemek yerine etiketin kendisi kullanılıyor: araç çubuğu
 * mobilde zaten dar.
 */
function PeriodJump({
  date,
  label,
  onPick,
}: {
  date: Date;
  label: string;
  onPick: (next: Date) => void;
}) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(date.getFullYear());

  // Pencere her açıldığında görüntülenen yıla dön.
  function change(next: boolean) {
    if (next) setYear(date.getFullYear());
    setOpen(next);
  }

  return (
    <Popover open={open} onOpenChange={change}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="ml-1 flex min-w-0 flex-1 items-center gap-1 truncate rounded-md px-1 py-0.5 text-base font-semibold tracking-tight transition-colors hover:bg-muted sm:flex-none"
        >
          <span className="truncate">{label}</span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-64">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setYear((y) => y - 1)}
            aria-label="Önceki yıl"
          >
            <ChevronLeft />
          </Button>
          <span className="tabular text-sm font-semibold">{year}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setYear((y) => y + 1)}
            aria-label="Sonraki yıl"
          >
            <ChevronRight />
          </Button>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-1">
          {AY_ADLARI.map((ad, ay) => {
            const secili = year === date.getFullYear() && ay === date.getMonth();
            return (
              <button
                key={ad}
                type="button"
                onClick={() => {
                  onPick(new Date(year, ay, 1));
                  setOpen(false);
                }}
                className={cn(
                  "rounded-md px-2 py-1.5 text-sm transition-colors",
                  secili
                    ? "bg-primary font-medium text-primary-foreground"
                    : "hover:bg-muted",
                )}
              >
                {ad}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
