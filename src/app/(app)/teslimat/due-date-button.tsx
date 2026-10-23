"use client";

import { useState, useTransition } from "react";
import { CalendarClock, Loader2 } from "lucide-react";
import { addDays, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDate, toISODate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { setDeliveryDueDate } from "../rezervasyonlar/actions";

/** Çekim tarihinden itibaren sık kullanılan teslim süreleri. */
const PRESETS = [14, 30, 45, 60];

/**
 * Teslim hedef tarihi: rozet olarak görünür, tıklayınca tarih seçilir.
 * Hazır süreler çekim gününden sayılır — fotoğrafçı genelde "30 gün içinde"
 * der, takvimde gün saymak zorunda kalmasın.
 */
export function DueDateButton({
  reservationId,
  eventDate,
  value,
  overdue,
  daysLeft,
}: {
  reservationId: string;
  eventDate: string;
  value: string | null;
  overdue: boolean;
  daysLeft: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function save(next: string | null) {
    setOpen(false);
    startTransition(async () => {
      const result = await setDeliveryDueDate(reservationId, next);
      if (result.ok) toast.success(next ? "Teslim tarihi kaydedildi." : "Teslim tarihi kaldırıldı.");
      else toast.error(result.error);
    });
  }

  const label = !value
    ? "Teslim tarihi belirle"
    : overdue
      ? `${formatDate(value)} · ${-(daysLeft ?? 0)} gün gecikti`
      : daysLeft === 0
        ? "Bugün teslim"
        : `${formatDate(value)} · ${daysLeft} gün kaldı`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          className={cn(
            "h-7 gap-1.5 px-2 text-xs font-normal",
            !value && "text-muted-foreground",
            overdue && "border-destructive/40 bg-destructive/10 text-destructive",
          )}
        >
          {pending ? <Loader2 className="animate-spin" /> : <CalendarClock />}
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(20rem,calc(100vw-2rem))] p-0"
        align="start"
        collisionPadding={16}
      >
        <div className="grid grid-cols-2 gap-1.5 border-b p-3">
          {PRESETS.map((gun) => (
            <Button
              key={gun}
              type="button"
              variant="secondary"
              size="sm"
              className="h-7 text-xs"
              onClick={() => save(toISODate(addDays(parseISO(eventDate), gun)))}
            >
              Çekim + {gun} gün
            </Button>
          ))}
        </div>
        <Calendar
          mode="single"
          locale={tr}
          weekStartsOn={1}
          className="mx-auto"
          selected={value ? parseISO(value) : undefined}
          defaultMonth={value ? parseISO(value) : parseISO(eventDate)}
          onSelect={(date) => date && save(toISODate(date))}
        />
        {value && (
          <div className="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => save(null)}
            >
              Hedefi kaldır
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
