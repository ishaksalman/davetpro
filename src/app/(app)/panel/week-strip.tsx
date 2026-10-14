import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { ORGANIZATION_TYPE_LABELS } from "@/lib/constants";
import { formatTimeRange } from "@/lib/format";
import type { ReservationRow } from "@/lib/queries";
import { buyukHarf, type Vertical } from "@/lib/vertical";

/**
 * Bu haftanın (bugünden pazara) etkinlikleri, kaynak renginde kartlar.
 * Hafta boşsa hiç çizilmiyor.
 */
export function WeekStrip({
  today,
  events,
  sozluk,
}: {
  today: Date;
  events: ReservationRow[];
  sozluk: Vertical;
}) {
  if (events.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium">
          Bu hafta · {events.length} {sozluk.event.singular}
        </h2>
        <Link
          href="/takvim"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Takvim
          <ArrowRight className="size-3" />
        </Link>
      </div>

      <ul className="-mx-4 flex snap-x snap-proximity gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] sm:overflow-visible sm:px-0">
        {events.map((r, i) => (
          <li
            key={r.id}
            className="w-56 shrink-0 animate-in snap-start duration-500 fill-mode-both fade-in-0 slide-in-from-bottom-2 motion-reduce:animate-none sm:w-auto"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <WeekCard reservation={r} today={today} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function WeekCard({ reservation: r, today }: { reservation: ReservationRow; today: Date }) {
  const date = parseISO(r.event_date);
  const days = differenceInCalendarDays(date, today);
  const day =
    days === 0 ? "Bugün" : days === 1 ? "Yarın" : buyukHarf(format(date, "EEEE", { locale: tr }));
  const color = r.venue?.color ?? "var(--muted-foreground)";

  return (
    <Link
      href={`/rezervasyonlar/${r.id}`}
      className="block h-full rounded-xl border p-3.5 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-sm focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      style={{
        backgroundColor: `color-mix(in oklch, ${color} 12%, var(--card))`,
        borderColor: `color-mix(in oklch, ${color} 28%, var(--card))`,
      }}
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold" style={{ color: `color-mix(in oklch, ${color} 70%, var(--foreground))` }}>
          {day}
          {days > 1 && (
            <span className="tabular font-normal text-muted-foreground"> · {format(date, "dd.MM")}</span>
          )}
        </span>
        <span className="tabular text-muted-foreground">
          {formatTimeRange(r.start_time, r.end_time)}
        </span>
      </div>
      <p className="mt-2 truncate text-sm font-semibold">{r.customer?.full_name ?? "—"}</p>
      <p className="truncate text-xs text-muted-foreground">
        {r.venue?.name} · {ORGANIZATION_TYPE_LABELS[r.organization_type]}
      </p>
    </Link>
  );
}
