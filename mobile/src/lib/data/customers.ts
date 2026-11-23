import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customerSchema, type CustomerInput } from "@/lib/schemas";
import { toTurkishError } from "@/lib/errors";
import type { CustomerBalance, Reservation, ReservationFinancials } from "@/lib/database.types";
import { supabase } from "../supabase";
import { fetchLookups, keys } from "./lookups";
import { unwrap } from "./query-error";
import { buildReservationRows } from "./rows";

export type SaveCustomerResult = { ok: true; id: string } | { ok: false; error: string };

/** Müşteri kaydet (web `saveCustomer` ile aynı: aynı şema, insert/update, `id` döner). */
export function useSaveCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CustomerInput): Promise<SaveCustomerResult> => {
      const parsed = customerSchema.safeParse(input);
      if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };
      const { id, ...values } = parsed.data;
      const res = id
        ? await supabase.from("customers").update(values).eq("id", id).select("id").single()
        : await supabase.from("customers").insert(values).select("id").single();
      if (res.error) return { ok: false, error: toTurkishError(res.error) };
      qc.invalidateQueries({ queryKey: keys.lookups });
      qc.invalidateQueries({ queryKey: keys.reservations });
      qc.invalidateQueries({ queryKey: ["customers"] });
      return { ok: true, id: (res.data as { id: string }).id };
    },
  });
}

/** Müşteri bakiyeleri (customer_balances view). Finans yetkisi yoksa RLS boş küme döner — hata değil. */
export function useCustomerBalances(enabled: boolean) {
  return useQuery({
    queryKey: ["customers", "balances"],
    enabled,
    queryFn: async () => {
      const rows = unwrap(await supabase.from("customer_balances").select("*").returns<CustomerBalance[]>());
      return new Map(rows.map((b) => [b.customer_id, b] as const));
    },
  });
}

/** Müşterinin rezervasyonları (en yeni önce), finansla birlikte. */
export function useCustomerReservations(customerId: string) {
  return useQuery({
    queryKey: ["customers", "reservations", customerId],
    queryFn: async () => {
      const lookups = await fetchLookups();
      const res = unwrap(await supabase.from("reservations").select("*").eq("customer_id", customerId).order("event_date", { ascending: false }).limit(200).returns<Reservation[]>());
      const ids = res.map((r) => r.id);
      const fin = ids.length ? unwrap(await supabase.from("reservation_financials").select("*").in("reservation_id", ids).returns<ReservationFinancials[]>()) : [];
      return buildReservationRows(res, fin, [], lookups);
    },
  });
}
