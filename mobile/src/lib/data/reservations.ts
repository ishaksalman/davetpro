import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endOfMonth, format, startOfMonth } from "date-fns";
import type { DeliveryStatus, Reservation, ReservationFinancials, ReservationItem, ReservationStatus } from "@/lib/database.types";
import type { ReservationInput } from "@/lib/schemas";
import { STAGES, type Stage } from "@/lib/stage";
import { todayISO, today as businessToday } from "@/lib/time";
import { toTurkishError } from "@/lib/errors";
import { prepareReservation } from "../domain/reservation-payload";
import { supabase } from "../supabase";
import { fetchLookups, keys } from "./lookups";
import { QueryError, unwrap } from "./query-error";
import { buildReservationRows } from "./rows";
import type { Lookups, ReservationRow } from "./types";

export type ListScope = "upcoming" | "month" | "past" | "cancelled";
export const PAGE_SIZE = 20;

/** Arama: ad / telefon (müşteri listesinden) ya da tam tarih (gg.aa.yyyy). */
export function matchSearch(search: string, lookups: Lookups): { customerIds: string[] | null; date: string | null } {
  const q = search.trim();
  if (!q) return { customerIds: null, date: null };
  const d = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(q);
  if (d) return { customerIds: null, date: `${d[3]}-${d[2].padStart(2, "0")}-${d[1].padStart(2, "0")}` };
  const needle = q.toLocaleLowerCase("tr-TR");
  const digits = q.replace(/\D/g, "");
  const ids = lookups.customers
    .filter((c) => c.full_name.toLocaleLowerCase("tr-TR").includes(needle) || (digits.length >= 3 && c.phone.replace(/\D/g, "").includes(digits)))
    .map((c) => c.id);
  return { customerIds: ids, date: null };
}

async function fetchFinancialsAndItems(ids: string[]) {
  if (ids.length === 0) return { financials: [] as ReservationFinancials[], items: [] as ReservationItem[] };
  const [fin, items] = await Promise.all([
    supabase.from("reservation_financials").select("*").in("reservation_id", ids).returns<ReservationFinancials[]>(),
    supabase.from("reservation_items").select("*").in("reservation_id", ids).order("sort_order").returns<ReservationItem[]>(),
  ]);
  // Finans yetkisi olmayanda `fin` BOŞ KÜME döner (hata değil); gerçek hata fırlatılır.
  return { financials: unwrap(fin), items: unwrap(items) };
}

export type ListPage = { rows: ReservationRow[]; next: number | null };

export function useReservationList(scope: ListScope, search: string) {
  return useInfiniteQuery({
    queryKey: [...keys.reservations, "list", scope, search.trim()],
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<ListPage> => {
      const lookups = await fetchLookups();
      const today = todayISO();
      const now = businessToday();
      const from = pageParam * PAGE_SIZE;

      let q = supabase.from("reservations").select("*");
      if (scope === "upcoming") q = q.gte("event_date", today).neq("status", "iptal_edildi").order("event_date", { ascending: true });
      else if (scope === "month")
        q = q
          .gte("event_date", format(startOfMonth(now), "yyyy-MM-dd"))
          .lte("event_date", format(endOfMonth(now), "yyyy-MM-dd"))
          .neq("status", "iptal_edildi")
          .order("event_date", { ascending: true });
      else if (scope === "past") q = q.lt("event_date", today).neq("status", "iptal_edildi").order("event_date", { ascending: false });
      else q = q.eq("status", "iptal_edildi").order("event_date", { ascending: false });
      q = q.order("start_time", { ascending: true });

      const m = matchSearch(search, lookups);
      if (m.date) q = q.eq("event_date", m.date);
      if (m.customerIds) {
        // Eşleşen müşteri yoksa boş sonuç (tüm liste değil).
        if (m.customerIds.length === 0) return { rows: [], next: null };
        q = q.in("customer_id", m.customerIds.slice(0, 200));
      }

      const reservations = unwrap(await q.range(from, from + PAGE_SIZE - 1).returns<Reservation[]>());
      const { financials, items } = await fetchFinancialsAndItems(reservations.map((r) => r.id));
      return {
        rows: buildReservationRows(reservations, financials, items, lookups),
        next: reservations.length === PAGE_SIZE ? pageParam + 1 : null,
      };
    },
    getNextPageParam: (last) => last.next,
  });
}

/** "Bu ay" çipindeki sayı (iptaller hariç). */
export function useMonthCount() {
  return useQuery({
    queryKey: [...keys.reservations, "month-count"],
    queryFn: async () => {
      const now = businessToday();
      const res = await supabase
        .from("reservations")
        .select("id", { count: "exact", head: true })
        .gte("event_date", format(startOfMonth(now), "yyyy-MM-dd"))
        .lte("event_date", format(endOfMonth(now), "yyyy-MM-dd"))
        .neq("status", "iptal_edildi");
      if (res.error) throw new QueryError(toTurkishError(res.error));
      return res.count ?? 0;
    },
  });
}

export function useReservation(id: string) {
  return useQuery({
    queryKey: keys.reservation(id),
    queryFn: async (): Promise<ReservationRow | null> => {
      const lookups = await fetchLookups();
      const r = unwrap(await supabase.from("reservations").select("*").eq("id", id).maybeSingle<Reservation>());
      if (!r) return null;
      const { financials, items } = await fetchFinancialsAndItems([r.id]);
      return buildReservationRows([r], financials, items, lookups)[0];
    },
  });
}

function useInvalidateReservations() {
  const qc = useQueryClient();
  return (id?: string) => {
    qc.invalidateQueries({ queryKey: keys.reservations });
    qc.invalidateQueries({ queryKey: keys.dashboard });
    qc.invalidateQueries({ queryKey: ["calendar"] });
    qc.invalidateQueries({ queryKey: ["finance"] });
    if (id) qc.invalidateQueries({ queryKey: keys.reservation(id) });
  };
}

export type SaveResult = { ok: true; id: string } | { ok: false; error: string };

/** Rezervasyonu RPC ile kaydeder; kapora girildiyse AYRI tahsilat satırı açar (web ile aynı). */
export function useSaveReservation(canFinance: boolean) {
  const invalidate = useInvalidateReservations();
  return useMutation({
    mutationFn: async (input: ReservationInput): Promise<SaveResult> => {
      const prepared = prepareReservation(input, canFinance);
      if (!prepared.ok) return prepared;

      const { data, error } = await supabase.rpc("save_reservation", prepared.args);
      if (error) return { ok: false, error: toTurkishError(error) };
      const id = data as string;

      if (prepared.deposit > 0) {
        const { error: payError } = await supabase.from("payments").insert({
          reservation_id: id,
          customer_id: prepared.customerId,
          amount: prepared.deposit,
          payment_date: todayISO(),
          category: "kapora",
          method: "nakit",
          description: prepared.args.p_id ? "Sonradan alınan kapora" : "Rezervasyon sırasında alınan kapora",
        });
        if (payError) {
          invalidate(id);
          return { ok: false, error: `Kayıt yapıldı ancak kapora tahsilatı eklenemedi: ${toTurkishError(payError)}` };
        }
      }
      invalidate(id);
      return { ok: true, id };
    },
  });
}

export function useUpdateStatus(id: string) {
  const invalidate = useInvalidateReservations();
  return useMutation({
    mutationFn: async (status: ReservationStatus) => {
      const { error } = await supabase.from("reservations").update({ status }).eq("id", id);
      if (error) throw new QueryError(toTurkishError(error));
    },
    onSuccess: () => invalidate(id),
  });
}

/** Fotoğrafçıda birleşik aşama: iki kolon TEK update ile yazılır (web ile aynı). */
export function useUpdateStage(id: string) {
  const invalidate = useInvalidateReservations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (stage: Stage) => {
      const hedef = STAGES[stage];
      const { error } = await supabase.from("reservations").update(hedef.writes).eq("id", id);
      if (error) throw new QueryError(toTurkishError(error));
    },
    onSuccess: () => { invalidate(id); qc.invalidateQueries({ queryKey: ["delivery"] }); },
  });
}

export type { DeliveryStatus };
