"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { CalendarRange, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { DatePicker } from "@/components/shared/date-picker";
import {
  RANGE_PRESET_LABELS,
  type DateRange,
  type RangePreset,
} from "@/lib/date-range";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Tarih aralığı seçici. Seçim URL'e yazılır (?aralik veya ?bas&bit) —
 * böylece sayfa yenilendiğinde ve paylaşıldığında aynı aralık korunur.
 */
export function DateRangeFilter({
  range,
  preset,
}: {
  range: DateRange;
  preset: RangePreset | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function apply(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    startTransition(() => router.push(`?${params.toString()}`, { scroll: false }));
  }

  const label = preset
    ? RANGE_PRESET_LABELS[preset]
    : `${formatDate(range.from)} – ${formatDate(range.to)}`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="font-normal">
          {pending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <CalendarRange className="text-muted-foreground" />
          )}
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3">
        <div className="grid grid-cols-2 gap-1.5">
          {(Object.keys(RANGE_PRESET_LABELS) as RangePreset[]).map((key) => (
            <Button
              key={key}
              variant={preset === key ? "secondary" : "ghost"}
              size="sm"
              className={cn("justify-start", preset === key && "font-medium")}
              onClick={() => apply({ aralik: key, bas: null, bit: null })}
            >
              {RANGE_PRESET_LABELS[key]}
            </Button>
          ))}
        </div>

        <Separator />

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Özel aralık</Label>
          <DatePicker
            value={range.from}
            onChange={(v) => v && apply({ bas: v, bit: range.to, aralik: null })}
            placeholder="Başlangıç"
          />
          <DatePicker
            value={range.to}
            onChange={(v) => v && apply({ bas: range.from, bit: v, aralik: null })}
            placeholder="Bitiş"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
