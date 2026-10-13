import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { ORGANIZATION_TYPE_LABELS } from "@/lib/constants";
import { formatMoney, formatTimeRange } from "@/lib/format";
import type { ReservationRow } from "@/lib/queries";
import type { Vertical } from "@/lib/vertical";
import { Card } from "@/components/ui/card";
import { StageBadge } from "@/components/shared/stage-badge";
import { cn } from "@/lib/utils";

const DAY = 24 * 60;
const MAX_ROWS = 4;

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Gece yarısını geçen ya da 00:00'da biten etkinlik gün sonuna kadar sayılır. */
function span(r: ReservationRow): [number, number] {
  const start = toMinutes(r.start_time);
  const end = toMinutes(r.end_time);
  return [start, end <= start ? DAY : end];
}

/**
 * Panelin en üstündeki şerit.
 *
 * Bugün etkinlik varsa hepsini saat sırasıyla ve günün çizelgesiyle
 * gösteriyor; yoksa sıradaki etkinliği. İkisi de yoksa hiç çizilmiyor —
 * "Yaklaşan" listesi boş durumu zaten anlatıyor.
 *
 * "Şimdi" sunucuda işletme saatine göre hesaplanıyor ve sayfa yenilenene
 * kadar sabit kalıyor; şerit kendi kendine hareket etmiyor.
 */
export function TodayStrip({
  today,
  todayEvents,
  next,
  nowMinutes,
  showFinance,
  sozluk,
}: {
  today: Date;
  todayEvents: ReservationRow[];
  next: ReservationRow | undefined;
  nowMinutes: number;
  showFinance: boolean;
  sozluk: Vertical;
}) {
  if (todayEvents.length > 0) {
    return (
      <Card className="flex-row gap-4 p-4">
        <DateTile date={today} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-medium">
              Bugün · {todayEvents.length} {sozluk.event.singular}
            </p>
            <Link
              href="/takvim"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Takvim
              <ArrowRight className="size-3" />
            </Link>
          </div>

          <ul className="mt-1 divide-y divide-dashed">
            {todayEvents.slice(0, MAX_ROWS).map((r) => (
              <TodayRow
                key={r.id}
                reservation={r}
                nowMinutes={nowMinutes}
                showFinance={showFinance}
              />
            ))}
          </ul>
          {todayEvents.length > MAX_ROWS && (
            <Link
              href="/takvim"
              className="block pt-1 text-xs text-muted-foreground hover:text-foreground"
            >
              +{todayEvents.length - MAX_ROWS} {sozluk.event.singular} daha
            </Link>
          )}

          <DayTimeline events={todayEvents} nowMinutes={nowMinutes} />
        </div>
      </Card>
    );
  }

  if (!next) return null;

  const days = differenceInCalendarDays(parseISO(next.event_date), today);

  return (
    <Card className="flex-row gap-4 p-4">
      <DateTile date={parseISO(next.event_date)} muted />
      <Link href={`/rezervasyonlar/${next.id}`} className="group min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Bugün boş · <span className="font-medium text-foreground">Sıradaki</span>
          </p>
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
            {days === 1 ? "Yarın" : `${days} gün sonra`}
          </span>
        </div>
        <p className="mt-1 truncate text-base font-semibold group-hover:underline">
          {next.customer?.full_name ?? "—"}
        </p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span className="tabular">
            {formatTimeRange(next.start_time, next.end_time)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-2 rounded-full"
              style={{ backgroundColor: next.venue?.color }}
            />
            {next.venue?.name}
          </span>
          <span>
            {ORGANIZATION_TYPE_LABELS[next.organization_type]}
            {next.guest_count ? ` · ${next.guest_count} kişi` : ""}
          </span>
        </p>
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-dashed pt-3">
          <StageBadge status={next.status} deliveryStatus={next.delivery_status} />
          {showFinance && next.balance_amount > 0 && (
            <span className="text-xs text-muted-foreground">
              Kalan{" "}
              <span className="tabular font-medium text-warning">
                {formatMoney(next.balance_amount)}
              </span>
            </span>
          )}
        </div>
      </Link>
    </Card>
  );
}

function DateTile({ date, muted }: { date: Date; muted?: boolean }) {
  return (
    <div
      className={cn(
        "flex h-[4.5rem] w-14 shrink-0 flex-col items-center justify-center rounded-lg",
        muted ? "bg-muted text-muted-foreground" : "bg-accent text-accent-foreground",
      )}
    >
      <span className="text-[10px] font-semibold tracking-wider uppercase">
        {format(date, "LLL", { locale: tr })}
      </span>
      <span className="tabular text-2xl leading-tight font-semibold text-foreground">
        {format(date, "d")}
      </span>
      <span className="text-[10px] font-medium">
        {format(date, "EEE", { locale: tr })}
      </span>
    </div>
  );
}

function TodayRow({
  reservation: r,
  nowMinutes,
  showFinance,
}: {
  reservation: ReservationRow;
  nowMinutes: number;
  showFinance: boolean;
}) {
  const [start, end] = span(r);
  const state = nowMinutes >= end ? "done" : nowMinutes >= start ? "now" : "later";

  return (
    <li>
      <Link
        href={`/rezervasyonlar/${r.id}`}
        className="flex items-center gap-3 py-2 hover:[&_.who]:underline"
      >
        <span
          aria-hidden
          className={cn("w-1 self-stretch rounded-full", state === "done" && "opacity-40")}
          style={{ backgroundColor: r.venue?.color }}
        />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "who truncate text-sm font-medium",
              state === "done" && "text-muted-foreground",
            )}
          >
            {r.customer?.full_name ?? "—"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            <span className="tabular">{formatTimeRange(r.start_time, r.end_time)}</span>
            {" · "}
            {r.venue?.name} · {ORGANIZATION_TYPE_LABELS[r.organization_type]}
            {showFinance && r.balance_amount > 0 && (
              <>
                {" · "}
                <span className="tabular text-warning">
                  Kalan {formatMoney(r.balance_amount)}
                </span>
              </>
            )}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
            state === "done" && "bg-muted text-muted-foreground",
            state === "now" && "bg-success/12 text-success",
            state === "later" && "tabular bg-accent text-accent-foreground",
          )}
        >
          {state === "done" ? "Bitti" : state === "now" ? "Sürüyor" : r.start_time.slice(0, 5)}
        </span>
      </Link>
    </li>
  );
}

/**
 * Günün çizelgesi: etkinlikler salon renginde, "şimdi" ince bir çizgi.
 * Pencere en erken başlangıçtan (en geç 10:00) gece yarısına kadar.
 */
function DayTimeline({
  events,
  nowMinutes,
}: {
  events: ReservationRow[];
  nowMinutes: number;
}) {
  const from = Math.min(10 * 60, ...events.map((r) => Math.floor(span(r)[0] / 60) * 60));
  const width = DAY - from;
  const pct = (m: number) => `${((Math.min(Math.max(m, from), DAY) - from) / width) * 100}%`;
  const showNow = nowMinutes >= from;
  const hh = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:00`;

  return (
    <div aria-hidden className="relative mt-2 mb-4 h-1.5 rounded-full bg-muted">
      {events.map((r) => {
        const [start, end] = span(r);
        return (
          <span
            key={r.id}
            className={cn(
              "absolute inset-y-0 rounded-full",
              nowMinutes >= end && "opacity-40",
            )}
            style={{
              left: pct(start),
              width: `calc(${pct(end)} - ${pct(start)})`,
              backgroundColor: r.venue?.color,
            }}
          />
        );
      })}
      <span className="absolute top-2.5 left-0 text-[10px] text-muted-foreground tabular">
        {hh(from)}
      </span>
      <span className="absolute top-2.5 right-0 text-[10px] text-muted-foreground tabular">
        24:00
      </span>
      {showNow && (
        <span
          className="absolute -top-1 h-3.5 w-0.5 -translate-x-1/2 rounded-full bg-foreground"
          style={{ left: pct(nowMinutes) }}
        />
      )}
    </div>
  );
}
