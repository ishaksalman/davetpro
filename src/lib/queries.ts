import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { toTurkishError } from "@/lib/errors";
import type {
  ReservationItem,
  Customer,
  Package,
  Reservation,
  ReservationFinancials,
  ReservationPricing,
  Venue,
} from "@/lib/database.types";

/**
 * Rezervasyon listelerinde kullanılan birleşik satır.
 * Salon/müşteri/paket bilgileri ayrı sorgulardan gelip burada birleştirilir —
 * bu tablolar küçük olduğu için gömülü join'e (PostgREST embed) gerek yoktur
 * ve bileşik yabancı anahtar belirsizliği riski ortadan kalkar.
 */
export type ReservationRow = Reservation & {
  pricing?: ReservationPricing | null;
  /**
   * Ek hizmet satırları. Düzenleme formu bunları geri yüklüyor; yüklenmezse
   * kaydetmek mevcut kalemleri silerdi. Finans yetkisi yoksa RLS boş döner —
   * o kullanıcı zaten fiyat da yazamıyor (save_reservation kontrol ediyor).
   */
  items: ReservationItem[];
  customer: { id: string; full_name: string; phone: string } | null;
  venue: { id: string; name: string; color: string } | null;
  package: { id: string; name: string; included_services: string[] } | null;
  net_amount: number;
  collected_amount: number;
  balance_amount: number;
  expense_amount: number;
  profit_amount: number;
  profit_margin: number | null;
  due_date: string | null;
  unit_price: number | null;
};

export type Lookups = {
  customers: Customer[];
  venues: Venue[];
  packages: Package[];
};

/**
 * Formlarda kullanılan sabit listeler.
 * React cache: aynı istek içinde birden çok kez çağrılsa da tek tur atar,
 * böylece sayfalar bunu kendi sorgularıyla paralel başlatabilir.
 */
export const getLookups = cache(async (): Promise<Lookups> => {
  const supabase = await createClient();
  const [customers, venues, packages] = await Promise.all([
    supabase.from("customers").select("*").order("full_name").returns<Customer[]>(),
    supabase.from("venues").select("*").order("name").returns<Venue[]>(),
    supabase.from("packages").select("*").order("name").returns<Package[]>(),
  ]);

  return {
    customers: customers.data ?? [],
    venues: venues.data ?? [],
    packages: packages.data ?? [],
  };
});

export type ReservationFilter = {
  id?: string;
  from?: string;
  to?: string;
  customerId?: string;
  limit?: number;
  /** Varsayılan artan; yaklaşan organizasyonlar için uygundur. */
  ascending?: boolean;
};

export async function getReservationRows(
  filter: ReservationFilter = {},
  lookups?: Lookups,
): Promise<{ rows: ReservationRow[]; error: string | null; truncated: boolean }> {
  const supabase = await createClient();

  let query = supabase
    .from("reservations")
    .select("*")
    .order("event_date", { ascending: filter.ascending ?? true })
    .order("start_time", { ascending: true });

  if (filter.id) query = query.eq("id", filter.id);
  if (filter.from) query = query.gte("event_date", filter.from);
  if (filter.to) query = query.lte("event_date", filter.to);
  if (filter.customerId) query = query.eq("customer_id", filter.customerId);
  // PostgREST varsayılan satır sınırına takılıp veriyi sessizce kırpmamak için
  // her zaman açık bir üst sınır veriyoruz. Bu sınıra yaklaşan bir işletme için
  // sunucu tarafı sayfalama gerekir (bkz. README · Bilinen sınırlar).
  const limit = filter.limit ?? 5000;
  query = query.limit(limit);

  const [reservationsResult, financialsResult, resolvedLookups] = await Promise.all([
    query.returns<Reservation[]>(),
    getFinancials(filter),
    lookups ? Promise.resolve(lookups) : getLookups(),
  ]);

  if (reservationsResult.error) {
    return {
      rows: [],
      error: toTurkishError(reservationsResult.error),
      truncated: false,
    };
  }
  // Finansal veri alınamadıysa sıfır göstermek yerine hatayı yukarı taşı.
  if (financialsResult.error) {
    return { rows: [], error: financialsResult.error, truncated: false };
  }

  const financials = new Map(
    financialsResult.rows.map((f) => [f.reservation_id, f] as const),
  );

  // Kalemler tek sorguda: satır başına ayrı sorgu listeyi N+1'e çevirirdi.
  const reservationIds = (reservationsResult.data ?? []).map((r) => r.id);
  const itemsResult = reservationIds.length
    ? await supabase
        .from("reservation_items")
        .select("*")
        .in("reservation_id", reservationIds)
        .order("sort_order")
        .returns<ReservationItem[]>()
    : { data: [], error: null };

  if (itemsResult.error) {
    return { rows: [], error: toTurkishError(itemsResult.error), truncated: false };
  }

  const itemsByReservation = new Map<string, ReservationItem[]>();
  for (const item of itemsResult.data ?? []) {
    const list = itemsByReservation.get(item.reservation_id) ?? [];
    list.push(item);
    itemsByReservation.set(item.reservation_id, list);
  }
  const customers = new Map(resolvedLookups.customers.map((c) => [c.id, c] as const));
  const venues = new Map(resolvedLookups.venues.map((v) => [v.id, v] as const));
  const packages = new Map(resolvedLookups.packages.map((p) => [p.id, p] as const));

  const rows = (reservationsResult.data ?? []).map<ReservationRow>((reservation) => {
    const f = financials.get(reservation.id);
    const customer = customers.get(reservation.customer_id);
    const venue = venues.get(reservation.venue_id);
    const pkg = reservation.package_id ? packages.get(reservation.package_id) : undefined;

    return {
      ...reservation,
      customer: customer
        ? { id: customer.id, full_name: customer.full_name, phone: customer.phone }
        : null,
      venue: venue ? { id: venue.id, name: venue.name, color: venue.color } : null,
      package: pkg
        ? {
            id: pkg.id,
            name: pkg.name,
            // Sözleşmede hizmet kapsamı bu listeden yazılıyor.
            included_services: pkg.included_services ?? [],
          }
        : null,
      pricing: f
        ? {
            reservation_id: reservation.id,
            business_id: reservation.business_id,
            package_amount: f.package_amount,
            extras_amount: f.extras_amount,
            gross_amount: f.gross_amount,
            discount_amount: f.discount_amount,
            net_amount: f.net_amount,
            due_date: f.due_date,
            unit_price: f.unit_price,
            created_at: reservation.created_at,
            updated_at: reservation.updated_at,
          }
        : null,
      items: itemsByReservation.get(reservation.id) ?? [],
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

  // Sınıra dayandıysak liste sessizce eksik kalmış olabilir; çağıran uyarsın.
  return { rows, error: null, truncated: rows.length >= limit };
}

async function getFinancials(
  filter: ReservationFilter,
): Promise<{ rows: ReservationFinancials[]; error: string | null }> {
  const supabase = await createClient();

  // DİKKAT: view'ın anahtarı "id" değil "reservation_id".
  let query = supabase.from("reservation_financials").select("*");
  if (filter.id) query = query.eq("reservation_id", filter.id);
  if (filter.from) query = query.gte("event_date", filter.from);
  if (filter.to) query = query.lte("event_date", filter.to);
  if (filter.customerId) query = query.eq("customer_id", filter.customerId);

  const { data, error } = await query.returns<ReservationFinancials[]>();

  // Finans yetkisi olmayan personelde RLS BOŞ KÜME döndürür — bu hata değildir.
  // Gerçek bir hata ise yutulmamalı: aksi halde tutarlar sessizce ₺0 görünür,
  // ki bu para söz konusuyken kabul edilemez.
  if (error) {
    // Günlüğe ham metin, kullanıcıya çevrilmiş mesaj.
    console.error("[queries] reservation_financials okunamadı:", error.message);
    return { rows: [], error: toTurkishError(error) };
  }

  return { rows: data ?? [], error: null };
}

/** Tek bir rezervasyon — detay sayfası tüm listeyi çekmesin diye. */
export async function getReservationById(
  id: string,
): Promise<{ reservation: ReservationRow | null; error: string | null }> {
  const { rows, error } = await getReservationRows({ id, limit: 1 });
  return { reservation: rows[0] ?? null, error };
}
