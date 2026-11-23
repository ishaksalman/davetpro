import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

const WEEKDAY3 = ["PAZ", "PZT", "SAL", "ÇAR", "PER", "CUM", "CMT"] as const;

/** Kart tarih bloğu: "CMT" / "17" / "Ekim". */
export function dateBlock(iso: string) {
  const d = parseISO(iso);
  return { weekday: WEEKDAY3[d.getDay()], day: String(d.getDate()), month: format(d, "LLLL", { locale: tr }).replace(/^./, (c) => c.toLocaleUpperCase("tr-TR")) };
}

/** "PAZAR, 11 EKİM" — Türkçe büyük harf (İ/I) için toLocaleUpperCase("tr-TR"). */
export function greetingDate(iso: string): string {
  return format(parseISO(iso), "EEEE, d MMMM", { locale: tr }).toLocaleUpperCase("tr-TR");
}

export function greeting(hour: number): string {
  if (hour < 5) return "İyi geceler";
  if (hour < 12) return "Günaydın";
  if (hour < 18) return "İyi günler";
  return "İyi akşamlar";
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "";
}

import { APP_TIME_ZONE } from "@/lib/time";

const hourFmt = new Intl.DateTimeFormat("en-GB", { timeZone: APP_TIME_ZONE, hour: "2-digit", hourCycle: "h23" });
/** İşletme saatine (Europe/Istanbul) göre saat 0–23. */
export function businessHour(now: Date = new Date()): number {
  return Number(hourFmt.format(now));
}
