import { useQuery } from "@tanstack/react-query";
import type {
  Expense, ExpenseCategory, FinanceSummary, MonthlySeriesRow, Payment, TypeBreakdownRow, VenuePerformanceRow,
} from "@/lib/database.types";
import { INCOME_CATEGORY_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { toTurkishError } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { today as businessToday } from "@/lib/time";
import { lastSixMonths, presetRange, type RangePreset } from "../domain/ranges";
import { supabase } from "../supabase";
import { fetchLookups } from "./lookups";
import { QueryError, unwrap } from "./query-error";

export type Movement = {
  key: string;
  kind: "income" | "expense";
  id: string;
  date: string;
  title: string;
  meta: string;
  amount: number;
  voided: boolean;
  voidReason: string | null;
  reservationId: string | null;
};

export type FinanceReport = {
  range: { from: string; to: string };
  summary: FinanceSummary;
  series: MonthlySeriesRow[];
  movements: Movement[];
  venues: VenuePerformanceRow[];
  types: TypeBreakdownRow[];
};

const rpc = async <T,>(name: string, args: { p_from: string; p_to: string }): Promise<T[]> => {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new QueryError(toTurkishError(error));
  return (data ?? []) as T[];
};

/**
 * Nakit akışı (işlem tarihine göre) ve kârlılık (organizasyon tarihine göre)
 * AYRI kavramlardır; ikisi de web'deki RPC'lerden gelir. Herhangi bir sorgu
 * hata verirse sıfır göstermek yerine ErrorState (hata fırlatılır).
 * Yalnızca finans yetkisi olan kullanıcıda çağrılır (RLS zaten kısıtlar).
 */
export function useFinanceReport(preset: RangePreset, enabled: boolean) {
  return useQuery({
    queryKey: ["finance", "report", preset],
    enabled,
    queryFn: async (): Promise<FinanceReport> => {
      const now = businessToday();
      const range = presetRange(preset, now);
      const six = lastSixMonths(now);
      const [summary, series, venues, types, lookups, payments, expenses, categories] = await Promise.all([
        rpc<FinanceSummary>("finance_summary", { p_from: range.from, p_to: range.to }),
        rpc<MonthlySeriesRow>("monthly_series", { p_from: six.from, p_to: six.to }),
        rpc<VenuePerformanceRow>("venue_performance", { p_from: range.from, p_to: range.to }),
        rpc<TypeBreakdownRow>("type_breakdown", { p_from: range.from, p_to: range.to }),
        fetchLookups(),
        supabase.from("payments").select("*").gte("payment_date", range.from).lte("payment_date", range.to)
          .order("payment_date", { ascending: false }).order("created_at", { ascending: false }).limit(50).returns<Payment[]>(),
        supabase.from("expenses").select("*").gte("expense_date", range.from).lte("expense_date", range.to)
          .order("expense_date", { ascending: false }).order("created_at", { ascending: false }).limit(50).returns<Expense[]>(),
        supabase.from("expense_categories").select("*").returns<ExpenseCategory[]>(),
      ]);
      const names = new Map(lookups.customers.map((c) => [c.id, c.full_name] as const));
      const cats = new Map(unwrap(categories).map((c) => [c.id, c.name] as const));

      const movements: Movement[] = [
        ...unwrap(payments).map<Movement>((p) => ({
          key: `p-${p.id}`, kind: "income", id: p.id, date: p.payment_date, amount: p.amount, voided: !!p.voided_at, voidReason: p.void_reason, reservationId: p.reservation_id,
          title: `${INCOME_CATEGORY_LABELS[p.category]}${p.customer_id && names.get(p.customer_id) ? ` · ${names.get(p.customer_id)}` : ""}`,
          meta: `${PAYMENT_METHOD_LABELS[p.method]} · ${formatDate(p.payment_date)}`,
        })),
        ...unwrap(expenses).map<Movement>((e) => ({
          key: `e-${e.id}`, kind: "expense", id: e.id, date: e.expense_date, amount: e.amount, voided: !!e.voided_at, voidReason: e.void_reason, reservationId: e.reservation_id,
          title: e.vendor ? `${cats.get(e.category_id) ?? "Gider"} · ${e.vendor}` : (cats.get(e.category_id) ?? "Gider"),
          meta: `${e.description ? `${e.description} · ` : ""}${PAYMENT_METHOD_LABELS[e.method]} · ${formatDate(e.expense_date)}`,
        })),
      ].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

      return {
        range,
        summary: summary[0] ?? ({ total_sales: 0, collected_in_range: 0, outstanding: 0, total_expenses: 0, net_cash: 0, profit: 0, profit_margin: null, reservation_count: 0, avg_sale: null } as FinanceSummary),
        series,
        movements,
        venues: venues.filter((v) => Number(v.reservation_count) > 0),
        types,
      };
    },
  });
}
