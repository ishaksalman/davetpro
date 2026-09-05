import {
  endOfMonth,
  endOfYear,
  startOfMonth,
  startOfYear,
  subMonths,
} from "date-fns";
import { toISODate } from "@/lib/format";
import { today as businessToday } from "@/lib/time";

export type RangePreset =
  | "bu-ay"
  | "gecen-ay"
  | "son-3-ay"
  | "son-12-ay"
  | "bu-yil";

export const RANGE_PRESET_LABELS: Record<RangePreset, string> = {
  "bu-ay": "Bu ay",
  "gecen-ay": "Geçen ay",
  "son-3-ay": "Son 3 ay",
  "son-12-ay": "Son 12 ay",
  "bu-yil": "Bu yıl",
};

export type DateRange = { from: string; to: string };

export function resolvePreset(
  preset: RangePreset,
  today = businessToday(),
): DateRange {
  switch (preset) {
    case "gecen-ay": {
      const previous = subMonths(today, 1);
      return {
        from: toISODate(startOfMonth(previous)),
        to: toISODate(endOfMonth(previous)),
      };
    }
    case "son-3-ay":
      return {
        from: toISODate(startOfMonth(subMonths(today, 2))),
        to: toISODate(endOfMonth(today)),
      };
    case "son-12-ay":
      return {
        from: toISODate(startOfMonth(subMonths(today, 11))),
        to: toISODate(endOfMonth(today)),
      };
    case "bu-yil":
      return { from: toISODate(startOfYear(today)), to: toISODate(endOfYear(today)) };
    case "bu-ay":
    default:
      return { from: toISODate(startOfMonth(today)), to: toISODate(endOfMonth(today)) };
  }
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * URL'deki ?bas / ?bit / ?aralik parametrelerinden tarih aralığı üretir.
 * Geçersiz değerlerde sessizce varsayılana (bu ay) döner.
 */
export function parseDateRange(searchParams: {
  bas?: string | string[];
  bit?: string | string[];
  aralik?: string | string[];
}): DateRange & { preset: RangePreset | null } {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const from = first(searchParams.bas);
  const to = first(searchParams.bit);

  if (from && to && ISO.test(from) && ISO.test(to) && from <= to) {
    return { from, to, preset: null };
  }

  const preset = first(searchParams.aralik);
  const valid = (Object.keys(RANGE_PRESET_LABELS) as RangePreset[]).includes(
    preset as RangePreset,
  )
    ? (preset as RangePreset)
    : "bu-ay";

  return { ...resolvePreset(valid), preset: valid };
}
