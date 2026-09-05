"use client";

import { useState } from "react";
import { CalendarIcon, X } from "lucide-react";
import { parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDateLong, toISODate } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Tarih seçici. Değer her zaman "yyyy-MM-dd" biçiminde tutulur; gösterim
 * Türkçe uzun tarihtir (12 Eylül 2026 Cumartesi).
 */
export function DatePicker({
  value,
  onChange,
  id,
  placeholder = "Tarih seçin",
  clearable = false,
  disabled,
  className,
}: {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  id?: string;
  placeholder?: string;
  clearable?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? parseISO(value) : undefined;

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start font-normal",
              !value && "text-muted-foreground",
              clearable && value && "pr-9",
            )}
          >
            <CalendarIcon className="text-muted-foreground" />
            {value ? formatDateLong(value) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            locale={tr}
            weekStartsOn={1}
            selected={selected}
            defaultMonth={selected}
            onSelect={(date) => {
              onChange(date ? toISODate(date) : null);
              setOpen(false);
            }}
            autoFocus
          />
        </PopoverContent>
      </Popover>

      {clearable && value && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-1/2 right-1 size-8 -translate-y-1/2"
          onClick={() => onChange(null)}
          aria-label="Tarihi temizle"
        >
          <X className="size-3.5" />
        </Button>
      )}
    </div>
  );
}
