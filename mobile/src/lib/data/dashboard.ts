import { useQuery } from "@tanstack/react-query";
import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import type { FinanceSummary, MonthlySeriesRow, Reservation, ReservationFinancials } from "@/lib/database.types";
import { sumMoney } from "@/lib/format";
import { today as businessToday, todayISO } from "@/lib/time";
import { lastSixMonths, monthShort } from "../domain/ranges";
import { monthOverMonth, type Trend } from "@/lib/trend";
import { monthOccupancy, sixMonthRanges, type OccupancyRow } from "../domain/occupancy";
import { supabase } from "../supabase";
import { fetchLookups, keys } from "./lookups";
import { buildReservationRows } from "./rows";
import { unwrap } from "./query-error";
import type { ReservationRow } from "./types";

export type DashboardData = {
  today: string;
  todayRows: ReservationRow[];
  /** Finans yetkisi yoksa null: ekran tutarları hiç çizmez. */
  finance: null | {
    collectedThisMonth: number;
    collectedTrend: Trend | null;
    outstanding: number;
    outstandingCount: number;
    /** Sınıra dayandıysa toplam eksik olabilir. */
    outstandingTruncated: boolean;
    /** Son 6 ay tahsilat (işlem tarihine göre) — kahraman kartındaki mini grafik. */
    series: { label: string; value: number }[];
    due: ReservationRow[];
  };
  counts: { month: number; upcoming: number };
  /** Bu ay doluluk %, bkz. `monthOccupancy`. */
  occupancy: number;
  /** Doluluğun geçen aya göre değişimi; geçen ay doluluk yoksa null. */
  occupancyTrend: Trend | null;
  /** Son 6 ay iş sayısı (iptaller hariç), eskiden yeniye; sonuncusu içinde bulunulan ay. */
  months: { label: string; count: number }[];
};

const OUTSTANDING_LIMIT = 5000;

async function rowsFor(ids: string[]): Promise<ReservationRow[]> {
  if (ids.length === 0) return [];
  const lookups = await fetchLookups();
  const [res, fin, items] = await Promise.all([
    supabase.from("reservations").select("*").in("id", ids).returns<Reservation[]>(),
    supabase.from("reservation_financials").select("*").in("reservation_id", ids).returns<ReservationFinancials[]>(),
    supabase.from("reservation_items").select("*").in("reservation_id", ids),
  ]);
  const order = new Map(ids.map((id, i) => [id, i] as const));
  return buildReservationRows(unwrap(res), unwrap(fin), unwrap(items) as never, lookups).sort(
    (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
  );
}

export function useDashboard(canFinance: boolean) {
  return useQuery({
    queryKey: [...keys.dashboard, canFinance],
    queryFn: async (): Promise<DashboardData> => {
      const today = todayISO();
      const now = businessToday();
      const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");
      const prev = subMonths(now, 1);
      const prevStart = format(startOfMonth(prev), "yyyy-MM-dd");
      const prevEnd = format(endOfMonth(prev), "yyyy-MM-dd");

      const todayIds = unwrap(
        await supabase.from("reservations").select("id").eq("event_date", today).neq("status", "iptal_edildi").order("start_time", { ascending: true }).returns<{ id: string }[]>(),
      ).map((r) => r.id);

      const ranges = sixMonthRanges(now);
      const [monthRows, prevMonthRows, prevCounts, upcomingCount, todayRows, lookups] = await Promise.all([
        supabase.from("reservations").select("event_date, venue_id").gte("event_date", monthStart).lte("event_date", monthEnd).neq("status", "iptal_edildi").returns<OccupancyRow[]>(),
        supabase.from("reservations").select("event_date, venue_id").gte("event_date", prevStart).lte("event_date", prevEnd).neq("status", "iptal_edildi").returns<OccupancyRow[]>(),
        Promise.all(ranges.slice(0, 5).map((r) => supabase.from("reservations").select("id", { count: "exact", head: true }).gte("event_date", r.from).lte("event_date", r.to).neq("status", "iptal_edildi"))),
        supabase.from("reservations").select("id", { count: "exact", head: true }).gte("event_date", today).neq("status", "iptal_edildi"),
        rowsFor(todayIds),
        fetchLookups(),
      ]);
      if (upcomingCount.error) throw new Error(upcomingCount.error.message);
      const monthData = unwrap(monthRows);
      for (const c of prevCounts) if (c.error) throw new Error(c.error.message);

      const counts = { month: monthData.length, upcoming: upcomingCount.count ?? 0 };
      const occupancy = monthOccupancy(monthData, now, lookups.venues.length);
      const extra = { occupancy, occupancyTrend: monthOverMonth(occupancy, monthOccupancy(unwrap(prevMonthRows), prev, lookups.venues.length)), months: ranges.map((r, i) => ({ label: r.label, count: i < 5 ? (prevCounts[i].count ?? 0) : monthData.length })) };
      if (!canFinance) return { today, todayRows, finance: null, counts, ...extra };

      const six = lastSixMonths(now);
      const [cur, prv, owing, dueIds, series] = await Promise.all([
        supabase.rpc("finance_summary", { p_from: monthStart, p_to: monthEnd }),
        supabase.rpc("finance_summary", { p_from: prevStart, p_to: prevEnd }),
        supabase.from("reservation_financials").select("balance_amount").neq("status", "iptal_edildi").gt("balance_amount", 0).limit(OUTSTANDING_LIMIT).returns<{ balance_amount: number }[]>(),
        // Yaklaşan ödemeler: ödeme tarihi girilmiş, bakiyesi kalan, tarihi gelmemiş işler (web ile aynı kural).
        supabase.from("reservation_financials").select("reservation_id").neq("status", "iptal_edildi").gt("balance_amount", 0).not("due_date", "is", null).gte("event_date", today).order("due_date", { ascending: true }).limit(5).returns<{ reservation_id: string }[]>(),
        supabase.rpc("monthly_series", { p_from: six.from, p_to: six.to }),
      ]);

      // Finans verisi okunamadıysa ₺0 göstermek yerine hata: sorgu hatası boş veri değildir.
      const summary = (unwrap(cur) as FinanceSummary[] | null)?.[0];
      const prevSummary = (unwrap(prv) as FinanceSummary[] | null)?.[0];
      const owingRows = unwrap(owing);
      const due = await rowsFor(unwrap(dueIds).map((d) => d.reservation_id));

      return {
        today,
        todayRows,
        counts,
        ...extra,
        finance: {
          collectedThisMonth: summary?.collected_in_range ?? 0,
          collectedTrend: monthOverMonth(summary?.collected_in_range, prevSummary?.collected_in_range),
          outstanding: sumMoney(owingRows.map((r) => r.balance_amount)),
          outstandingCount: owingRows.length,
          outstandingTruncated: owingRows.length >= OUTSTANDING_LIMIT,
          series: ((unwrap(series) as MonthlySeriesRow[] | null) ?? []).map((m) => ({ label: monthShort(m.month), value: Number(m.collected) })),
          due,
        },
      };
    },
  });
}
