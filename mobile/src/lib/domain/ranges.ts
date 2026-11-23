import { endOfMonth, endOfYear, format, startOfMonth, startOfYear, subMonths } from "date-fns";

export type RangePreset = "bu-ay" | "gecen-ay" | "son-3-ay" | "bu-yil";
export type DateRange = { from: string; to: string };

export const RANGE_LABELS: Record<RangePreset, string> = {
  "bu-ay": "Bu ay",
  "gecen-ay": "Geçen ay",
  "son-3-ay": "Son 3 ay",
  "bu-yil": "Bu yıl",
};

const iso = (d: Date) => format(d, "yyyy-MM-dd");

/** `now`: işletme saatine göre bugün (yerel gece yarısı, bkz. @/lib/time `today()`). */
export function presetRange(p: RangePreset, now: Date): DateRange {
  switch (p) {
    case "bu-ay": return { from: iso(startOfMonth(now)), to: iso(endOfMonth(now)) };
    case "gecen-ay": { const m = subMonths(now, 1); return { from: iso(startOfMonth(m)), to: iso(endOfMonth(m)) }; }
    case "son-3-ay": return { from: iso(startOfMonth(subMonths(now, 2))), to: iso(endOfMonth(now)) };
    case "bu-yil": return { from: iso(startOfYear(now)), to: iso(endOfYear(now)) };
  }
}

/** Grafik için son 6 ay (içinde bulunulan ay dahil). */
export function lastSixMonths(now: Date): DateRange {
  return { from: iso(startOfMonth(subMonths(now, 5))), to: iso(endOfMonth(now)) };
}

const MONTH3 = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"] as const;
export const monthShort = (isoDate: string) => MONTH3[Number(isoDate.slice(5, 7)) - 1];

/** Çubuk yükseklikleri (px): en büyük değer `max` px; 0 ise 0, pozitifse en az 2 px. */
export function barHeights(values: number[], max: number): number[] {
  const top = Math.max(0, ...values);
  return values.map((v) => (v <= 0 || top <= 0 ? 0 : Math.max(2, Math.round((v / top) * max))));
}
