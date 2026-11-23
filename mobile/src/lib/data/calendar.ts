import { useQuery } from "@tanstack/react-query";
import type { Reservation, ReservationFinancials, VenueHold, Lead } from "@/lib/database.types";
import { supabase } from "../supabase";
import { fetchLookups } from "./lookups";
import { unwrap } from "./query-error";
import { buildReservationRows } from "./rows";
import type { ReservationRow } from "./types";

export type CalendarHoldItem = {
  id: string; lead_id: string; venue_id: string; event_date: string; start_time: string; end_time: string;
  expires_at: string; customer_name: string; venue_color: string; venue_name: string;
};

export type CalendarData = { rows: ReservationRow[]; holds: CalendarHoldItem[] };

/**
 * Takvim penceresi (görünen ayın hafta sınırlarıyla genişletilmiş aralığı):
 * iptal edilmeyen rezervasyonlar + AKTİF opsiyonlar. Opsiyon salonu bloke eder
 * (müsaitlik buna bakar), bu yüzden takvimde de görünür. Süresi dolanları web
 * `expire_venue_holds` RPC ile kapatır; burada da okumadan önce çağrılır.
 */
export function useCalendarRange(from: string, to: string) {
  return useQuery({
    queryKey: ["calendar", from, to],
    queryFn: async (): Promise<CalendarData> => {
      await supabase.rpc("expire_venue_holds", { p_venue_id: null });
      const lookups = await fetchLookups();
      const [res, holds] = await Promise.all([
        supabase.from("reservations").select("*").gte("event_date", from).lte("event_date", to).neq("status", "iptal_edildi")
          .order("event_date").order("start_time").limit(1000).returns<Reservation[]>(),
        supabase.from("venue_holds").select("*").eq("status", "aktif").gte("event_date", from).lte("event_date", to).returns<VenueHold[]>(),
      ]);
      const reservations = unwrap(res);
      const holdRows = unwrap(holds);

      // Finans bilgisi takvimde gösterilmez; yine de satır şekli ortak (boş finans).
      const rows = buildReservationRows(reservations, [] as ReservationFinancials[], [], lookups);

      const leadIds = [...new Set(holdRows.map((h) => h.lead_id))];
      const leads = leadIds.length
        ? unwrap(await supabase.from("leads").select("id, customer_id").in("id", leadIds).returns<Pick<Lead, "id" | "customer_id">[]>())
        : [];
      const leadCustomer = new Map(leads.map((l) => [l.id, l.customer_id] as const));
      const names = new Map(lookups.customers.map((c) => [c.id, c.full_name] as const));
      const venues = new Map(lookups.venues.map((v) => [v.id, v] as const));

      return {
        rows,
        holds: holdRows.map((h) => ({
          id: h.id, lead_id: h.lead_id, venue_id: h.venue_id, event_date: h.event_date, start_time: h.start_time, end_time: h.end_time,
          expires_at: h.expires_at, customer_name: names.get(leadCustomer.get(h.lead_id) ?? "") ?? "Talep",
          venue_color: venues.get(h.venue_id)?.color ?? "#6366f1", venue_name: venues.get(h.venue_id)?.name ?? "",
        })),
      };
    },
  });
}
