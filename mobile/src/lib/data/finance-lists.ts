import { useQuery } from "@tanstack/react-query";
import type { Expense, ExpenseCategory, Payment, Reservation, ReservationFinancials } from "@/lib/database.types";
import { sumMoney } from "@/lib/format";
import { today as businessToday } from "@/lib/time";
import { presetRange, type RangePreset } from "../domain/ranges";
import { supabase } from "../supabase";
import { fetchLookups } from "./lookups";
import { unwrap } from "./query-error";
import { buildReservationRows } from "./rows";
import type { ReservationRow } from "./types";

export type PaymentItem = Payment & { customer_name: string | null; reservation_label: string | null };
export type ExpenseItem = Expense & { category_name: string; reservation_label: string | null };

const label = (r: Pick<Reservation, "event_date" | "customer_id">, names: Map<string, string>) =>
  `${names.get(r.customer_id) ?? "Rezervasyon"} · ${r.event_date.split("-").reverse().join(".")}`;

/**
 * Gelirler (tahsilatlar): işlem tarihine göre dönem listesi — iptal edilenler de listelenir
 * (silinmez, üstü çizili). Özet yalnızca iptal edilmeyenlerden hesaplanır (kuruş toplamı).
 */
export function usePaymentList(preset: RangePreset, enabled: boolean) {
  return useQuery({
    queryKey: ["finance", "payments-list", preset],
    enabled,
    queryFn: async () => {
      const range = presetRange(preset, businessToday());
      const lookups = await fetchLookups();
      const names = new Map(lookups.customers.map((c) => [c.id, c.full_name] as const));
      const pays = unwrap(
        await supabase.from("payments").select("*").gte("payment_date", range.from).lte("payment_date", range.to)
          .order("payment_date", { ascending: false }).order("created_at", { ascending: false }).limit(500).returns<Payment[]>(),
      );
      const resIds = [...new Set(pays.map((p) => p.reservation_id).filter((x): x is string => !!x))];
      const res = resIds.length
        ? unwrap(await supabase.from("reservations").select("id, event_date, customer_id").in("id", resIds).returns<Pick<Reservation, "id" | "event_date" | "customer_id">[]>())
        : [];
      const resMap = new Map(res.map((r) => [r.id, r] as const));
      const items: PaymentItem[] = pays.map((p) => {
        const r = p.reservation_id ? resMap.get(p.reservation_id) : undefined;
        return {
          ...p,
          customer_name: (p.customer_id ? names.get(p.customer_id) : undefined) ?? (r ? names.get(r.customer_id) ?? null : null),
          reservation_label: r ? label(r, names) : null,
        };
      });
      const active = items.filter((i) => !i.voided_at);
      return {
        range,
        items,
        truncated: items.length >= 500,
        total: sumMoney(active.map((i) => i.amount)),
        cash: sumMoney(active.filter((i) => i.method === "nakit").map((i) => i.amount)),
        linked: sumMoney(active.filter((i) => i.reservation_id).map((i) => i.amount)),
        count: active.length,
      };
    },
  });
}

export function useExpenseListData(preset: RangePreset, enabled: boolean) {
  return useQuery({
    queryKey: ["finance", "expenses-list", preset],
    enabled,
    queryFn: async () => {
      const range = presetRange(preset, businessToday());
      const lookups = await fetchLookups();
      const names = new Map(lookups.customers.map((c) => [c.id, c.full_name] as const));
      const [exps, cats] = await Promise.all([
        supabase.from("expenses").select("*").gte("expense_date", range.from).lte("expense_date", range.to)
          .order("expense_date", { ascending: false }).order("created_at", { ascending: false }).limit(500).returns<Expense[]>(),
        supabase.from("expense_categories").select("*").returns<ExpenseCategory[]>(),
      ]);
      const list = unwrap(exps);
      const catMap = new Map(unwrap(cats).map((c) => [c.id, c.name] as const));
      const resIds = [...new Set(list.map((e) => e.reservation_id).filter((x): x is string => !!x))];
      const res = resIds.length
        ? unwrap(await supabase.from("reservations").select("id, event_date, customer_id").in("id", resIds).returns<Pick<Reservation, "id" | "event_date" | "customer_id">[]>())
        : [];
      const resMap = new Map(res.map((r) => [r.id, r] as const));
      const items: ExpenseItem[] = list.map((e) => ({
        ...e,
        category_name: catMap.get(e.category_id) ?? "Gider",
        reservation_label: e.reservation_id && resMap.get(e.reservation_id) ? label(resMap.get(e.reservation_id)!, names) : null,
      }));
      const active = items.filter((i) => !i.voided_at);
      return {
        range,
        items,
        truncated: items.length >= 500,
        total: sumMoney(active.map((i) => i.amount)),
        linked: sumMoney(active.filter((i) => i.reservation_id).map((i) => i.amount)),
        general: sumMoney(active.filter((i) => !i.reservation_id).map((i) => i.amount)),
        count: active.length,
      };
    },
  });
}

/** Tahsilat / gider eklerken bağlanabilecek rezervasyonlar: iptal edilmeyenler, en yeni önce. */
export function useLinkableReservations(enabled: boolean, onlyWithBalance: boolean) {
  return useQuery({
    queryKey: ["finance", "linkable", onlyWithBalance],
    enabled,
    staleTime: 30_000,
    queryFn: async (): Promise<ReservationRow[]> => {
      const lookups = await fetchLookups();
      let q = supabase.from("reservations").select("*").neq("status", "iptal_edildi").order("event_date", { ascending: false }).limit(150);
      const res = unwrap(await q.returns<Reservation[]>());
      const ids = res.map((r) => r.id);
      const fin = ids.length ? unwrap(await supabase.from("reservation_financials").select("*").in("reservation_id", ids).returns<ReservationFinancials[]>()) : [];
      const rows = buildReservationRows(res, fin, [], lookups);
      return onlyWithBalance ? rows.filter((r) => r.balance_amount > 0) : rows;
    },
  });
}
