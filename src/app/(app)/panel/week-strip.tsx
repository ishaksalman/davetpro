import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { addDays, format } from "date-fns";
import { tr } from "date-fns/locale";
import { toISODate } from "@/lib/format";
import type { ReservationRow } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const MAX_PER_DAY = 3;

/**
 * Bu haftanın (pazartesi–pazar) yedi sütunlu görünümü. Etkinlikler kaynak
 * renginde küçük etiketler; dar ekranda yalnızca saat, genişte saat ve ad.
 * Haftada hiç etkinlik yoksa çizilmiyor.
 */
export function WeekStrip({
  weekStart,
  today,
  events,
}: {
  weekStart: Date;
  /** yyyy-MM-dd */
  today: string;
  events: ReservationRow[];
}) {
  if (events.length === 0) return null;

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <Card className="gap-0 py-0 shadow-xs">
      <CardHeader className="border-b py-3">
        <CardTitle className="leading-8">Bu hafta</CardTitle>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link href="/takvim">
              Takvim
              <ArrowRight />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>

      <ol className="grid grid-cols-7 divide-x">
        {days.map((day) => {
          const iso = toISODate(day);
          const items = events.filter((r) => r.event_date === iso);
          const isToday = iso === today;
          const past = iso < today;

          return (
            <li key={iso} className={cn("min-w-0 p-1 sm:p-2", past && "opacity-50")}>
              <div className="flex flex-col items-center gap-0.5 pb-1.5 sm:flex-row sm:justify-between sm:px-1">
                <span className="text-[11px] text-muted-foreground">
                  {format(day, "EEEEEE", { locale: tr })}
                </span>
                <span
                  className={cn(
                    "tabular grid size-6 place-items-center rounded-full text-xs font-medium",
                    isToday && "bg-primary text-primary-foreground",
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>

              <ul className="space-y-1">
                {items.slice(0, MAX_PER_DAY).map((r) => {
                  const color = r.venue?.color ?? "var(--muted-foreground)";
                  return (
                    <li key={r.id}>
                      <Link
                        href={`/rezervasyonlar/${r.id}`}
                        title={`${r.start_time.slice(0, 5)} · ${r.customer?.full_name ?? ""} · ${r.venue?.name ?? ""}`}
                        className="flex items-center gap-1 rounded-md border-l-2 px-1 py-0.5 text-[11px] leading-tight transition-colors hover:brightness-95 sm:px-1.5 sm:py-1"
                        style={{
                          borderLeftColor: color,
                          backgroundColor: `color-mix(in oklch, ${color} 14%, var(--card))`,
                        }}
                      >
                        <span className="tabular shrink-0 font-medium">
                          {r.start_time.slice(0, 5)}
                        </span>
                        <span className="hidden truncate text-muted-foreground md:inline">
                          {r.customer?.full_name}
                        </span>
                      </Link>
                    </li>
                  );
                })}
                {items.length > MAX_PER_DAY && (
                  <li className="px-1 text-[11px] text-muted-foreground">
                    +{items.length - MAX_PER_DAY}
                  </li>
                )}
              </ul>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
