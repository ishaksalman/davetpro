import { addDays, addMonths, endOfMonth, format, parseISO, startOfMonth, startOfWeek } from "date-fns";

/** Hafta pazartesi başlar (Figma notu). Ayın görünen haftaları, ISO tarihlerle. */
export function monthGrid(anchorISO: string): string[][] {
  const first = startOfMonth(parseISO(anchorISO));
  const last = endOfMonth(first);
  let cursor = startOfWeek(first, { weekStartsOn: 1 });
  const weeks: string[][] = [];
  while (cursor <= last) {
    const week: string[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(format(cursor, "yyyy-MM-dd"));
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export function shiftMonth(anchorISO: string, delta: number): string {
  return format(startOfMonth(addMonths(parseISO(anchorISO), delta)), "yyyy-MM-dd");
}

export function monthRange(anchorISO: string): { from: string; to: string } {
  const d = parseISO(anchorISO);
  return { from: format(startOfMonth(d), "yyyy-MM-dd"), to: format(endOfMonth(d), "yyyy-MM-dd") };
}

export const WEEKDAY_HEADS = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"] as const;
