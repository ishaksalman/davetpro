import type { ReservationFinancials, Reservation, ReservationItem } from "@/lib/database.types";
import type { Lookups, ReservationRow } from "./types";

/**
 * Ham rezervasyon + finans view + kalemler + arama listelerinden satır üretir.
 * Saf fonksiyon (ağ yok) → test edilebilir. Finans yetkisi olmayanda
 * `financials` boş gelir (RLS); bu hata değildir, tutarlar 0 değil "yetkisiz"dir
 * ve ekranlar `canFinance` ile hiç çizmez.
 */
export function buildReservationRows(
  reservations: Reservation[],
  financials: ReservationFinancials[],
  items: ReservationItem[],
  lookups: Lookups,
): ReservationRow[] {
  const fin = new Map(financials.map((f) => [f.reservation_id, f] as const));
  const byRes = new Map<string, ReservationItem[]>();
  for (const it of items) {
    const list = byRes.get(it.reservation_id) ?? [];
    list.push(it);
    byRes.set(it.reservation_id, list);
  }
  const customers = new Map(lookups.customers.map((c) => [c.id, c] as const));
  const venues = new Map(lookups.venues.map((v) => [v.id, v] as const));
  const packages = new Map(lookups.packages.map((p) => [p.id, p] as const));
  const teams = new Map(lookups.teams.map((t) => [t.id, t] as const));

  return reservations.map<ReservationRow>((r) => {
    const f = fin.get(r.id);
    const c = customers.get(r.customer_id);
    const v = venues.get(r.venue_id);
    const t = r.team_id ? teams.get(r.team_id) : undefined;
    const p = r.package_id ? packages.get(r.package_id) : undefined;
    return {
      ...r,
      customer: c ? { id: c.id, full_name: c.full_name, phone: c.phone } : null,
      venue: v ? { id: v.id, name: v.name, color: v.color } : null,
      team: t ? { id: t.id, name: t.name, color: t.color } : null,
      package: p ? { id: p.id, name: p.name, included_services: p.included_services ?? [] } : null,
      pricing: f
        ? {
            reservation_id: r.id, business_id: r.business_id,
            package_amount: f.package_amount, extras_amount: f.extras_amount, gross_amount: f.gross_amount,
            discount_amount: f.discount_amount, net_amount: f.net_amount, due_date: f.due_date,
            unit_price: f.unit_price, created_at: r.created_at, updated_at: r.updated_at,
          }
        : null,
      items: byRes.get(r.id) ?? [],
      net_amount: f?.net_amount ?? 0,
      collected_amount: f?.collected_amount ?? 0,
      balance_amount: f?.balance_amount ?? 0,
      expense_amount: f?.expense_amount ?? 0,
      profit_amount: f?.profit_amount ?? 0,
      profit_margin: f?.profit_margin ?? null,
      due_date: f?.due_date ?? null,
      unit_price: f?.unit_price ?? null,
    };
  });
}

/** Tahsilat yüzdesi (0–100). Net sıfırsa 0. */
export function collectedPercent(net: number, collected: number): number {
  if (net <= 0) return 0;
  return Math.max(0, Math.min(100, (collected / net) * 100));
}
