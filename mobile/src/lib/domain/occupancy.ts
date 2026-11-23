import { endOfMonth, format, getDaysInMonth, startOfMonth, subMonths } from "date-fns";
import { monthShort } from "./ranges";

export type OccupancyRow = { event_date: string; venue_id: string | null };

/**
 * Ay doluluğu: dolu (gün × salon) çifti / toplam kapasite. Salonu olan işletmede kapasite
 * gün sayısı × salon sayısı; salonsuz işletmede (fotoğrafçı vb.) en az bir işi olan günler / gün sayısı.
 * İptaller çağıran tarafta elenmiş olmalı. Sonuç 0–100 tam sayı.
 */
export function monthOccupancy(rows: OccupancyRow[], monthDate: Date, venueCount: number): number {
  const days = getDaysInMonth(monthDate);
  const useVenues = venueCount > 0;
  const taken = new Set(rows.map((r) => (useVenues && r.venue_id ? `${r.event_date}|${r.venue_id}` : r.event_date)));
  const capacity = days * (useVenues ? venueCount : 1);
  return Math.min(100, Math.round((taken.size / capacity) * 100));
}

/** Son 6 ay (içinde bulunulan ay dahil) için ay aralıkları, eskiden yeniye. */
export function sixMonthRanges(now: Date): { from: string; to: string; label: string }[] {
  return Array.from({ length: 6 }, (_, i) => {
    const m = subMonths(now, 5 - i);
    const from = format(startOfMonth(m), "yyyy-MM-dd");
    return { from, to: format(endOfMonth(m), "yyyy-MM-dd"), label: monthShort(from) };
  });
}
