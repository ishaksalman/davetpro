import { useQuery } from "@tanstack/react-query";
import type { VenueAvailability } from "@/lib/database.types";
import { toTurkishError } from "@/lib/errors";
import { supabase } from "../supabase";
import { QueryError } from "./query-error";

export type AvailabilityQuery = {
  eventDate: string;
  startTime: string | null;
  endTime: string | null;
  ignoreLeadId?: string | null;
  ignoreReservationId?: string | null;
};

/** Salon müsaitliği (venue_availability RPC). Asıl otorite veritabanı trigger'ıdır. */
export async function fetchAvailability(q: AvailabilityQuery): Promise<VenueAvailability[]> {
  const { data, error } = await supabase.rpc("venue_availability", {
    p_event_date: q.eventDate,
    p_start_time: q.startTime || null,
    p_end_time: q.endTime || null,
    p_ignore_lead_id: q.ignoreLeadId ?? null,
    p_ignore_reservation_id: q.ignoreReservationId ?? null,
  });
  if (error) throw new QueryError(toTurkishError(error));
  return (data ?? []) as VenueAvailability[];
}

export function useAvailability(q: AvailabilityQuery | null) {
  return useQuery({
    queryKey: ["availability", q],
    enabled: !!q,
    staleTime: 15_000,
    queryFn: () => fetchAvailability(q!),
  });
}
