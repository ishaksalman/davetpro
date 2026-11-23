import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import type { CalendarHoldItem } from "../data/calendar";
import type { ReservationRow } from "../data/types";

export type AgendaItem =
  | { kind: "reservation"; key: string; date: string; start: string; end: string; row: ReservationRow }
  | { kind: "hold"; key: string; date: string; start: string; end: string; hold: CalendarHoldItem };

const hm = (t: string) => t.slice(0, 5);

/**
 * Rezervasyon ve opsiyonları gün gün birleştirir; gün içi sıra başlangıç saatine göre.
 * Salon filtresi `venueId` ile (null = tümü).
 */
export function buildAgenda(rows: ReservationRow[], holds: CalendarHoldItem[], venueId: string | null): Map<string, AgendaItem[]> {
  const out = new Map<string, AgendaItem[]>();
  const push = (it: AgendaItem) => out.set(it.date, [...(out.get(it.date) ?? []), it]);
  for (const row of rows) {
    if (venueId && row.venue_id !== venueId) continue;
    push({ kind: "reservation", key: row.id, date: row.event_date, start: hm(row.start_time), end: hm(row.end_time), row });
  }
  for (const hold of holds) {
    if (venueId && hold.venue_id !== venueId) continue;
    push({ kind: "hold", key: `h-${hold.id}`, date: hold.event_date, start: hm(hold.start_time), end: hm(hold.end_time), hold });
  }
  for (const [d, list] of out) out.set(d, list.sort((a, b) => a.start.localeCompare(b.start)));
  return out;
}

/** Gün altındaki noktalar: o günkü işlerin salon renkleri (tekrarsız değil; her iş bir nokta). */
export function dayDots(agenda: Map<string, AgendaItem[]>): Record<string, string[]> {
  const dots: Record<string, string[]> = {};
  for (const [d, list] of agenda) {
    dots[d] = list.map((i) => (i.kind === "reservation" ? (i.row.venue?.color ?? "#7a8396") : i.hold.venue_color));
  }
  return dots;
}

/** "17 EKİM, CUMARTESİ" — Türkçe büyük harf. */
export function dayHeading(iso: string): string {
  return format(parseISO(iso), "d MMMM, EEEE", { locale: tr }).toLocaleUpperCase("tr-TR");
}
