"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useVertical } from "@/components/layout/vertical-provider";
import { toISODate } from "@/lib/format";

const MAX_DOTS = 3;

export type CalendarItem = {
  id: string;
  title: string;
  time: string;
  color: string;
};

/**
 * Panelin yan sütunundaki ay takvimi. Dolu günlerin altında, o gündeki
 * etkinliklerin kaynak (salon/ekip) renginde nokta; aynı renkte iki etkinlik
 * tek nokta. Bir güne tıklayınca o günün etkinlikleri altta listeleniyor.
 *
 * Veri bu ayın başından itibaren geliyor; geçmiş aylara gidilirse noktalar
 * boş görünürdü, bu yüzden geri gezinme bu ayla sınırlı.
 */
export function MiniCalendar({
  today,
  days,
}: {
  /** İşletme saatine göre bugün (yyyy-MM-dd); tarayıcı saatine bırakılmıyor. */
  today: string;
  /** yyyy-MM-dd → o günün etkinlikleri, saat sırasıyla */
  days: Record<string, CalendarItem[]>;
}) {
  const sozluk = useVertical();
  const todayDate = parseISO(today);
  const [selected, setSelected] = useState<Date>(todayDate);
  const items = days[toISODate(selected)] ?? [];

  return (
    <Card className="gap-0 py-0 shadow-xs">
      <CardHeader className="border-b py-3">
        <CardTitle className="leading-8">Takvim</CardTitle>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link href="/takvim">
              Tümü
              <ArrowRight />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="p-3">
        <Calendar
          mode="single"
          required
          selected={selected}
          onSelect={setSelected}
          locale={tr}
          weekStartsOn={1}
          today={todayDate}
          startMonth={todayDate}
          className="w-full p-0 [--cell-size:--spacing(10)]"
          classNames={{ root: "w-full" }}
          components={{
            DayButton: ({ children, ...props }) => {
              const colors = [
                ...new Set((days[toISODate(props.day.date)] ?? []).map((i) => i.color)),
              ];
              return (
                <CalendarDayButton locale={tr} {...props}>
                  {children}
                  <span aria-hidden className="flex h-1.5 gap-0.5 !opacity-100">
                    {colors.slice(0, MAX_DOTS).map((color) => (
                      <span
                        key={color}
                        className="size-1.5 rounded-full ring-1 ring-background"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </span>
                  {colors.length > 0 && <span className="sr-only">, dolu</span>}
                </CalendarDayButton>
              );
            },
          }}
        />
      </CardContent>

      <div className="border-t px-4 py-3">
        <p className="text-xs font-medium text-muted-foreground">
          {format(selected, "d MMMM EEEE", { locale: tr })}
        </p>
        {items.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            Bu gün {sozluk.event.singular} yok.
          </p>
        ) : (
          <ul className="mt-1">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/rezervasyonlar/${item.id}`}
                  className="-mx-2 flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60"
                >
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="tabular w-11 shrink-0 text-xs text-muted-foreground">
                    {item.time}
                  </span>
                  <span className="truncate font-medium">{item.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
