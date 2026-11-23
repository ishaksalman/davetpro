import type {
  Customer, Package, Reservation, ReservationItem, ReservationPricing, Team, Venue,
} from "@/lib/database.types";

/**
 * Rezervasyon satırı: liste ve detayda kullanılan birleşik nesne.
 * Web'deki `ReservationRow` ile aynı şekil (src/lib/queries.ts); orada Next'e
 * bağlı olduğu için tip burada yeniden tanımlı.
 */
export type ReservationRow = Reservation & {
  pricing: ReservationPricing | null;
  items: ReservationItem[];
  customer: { id: string; full_name: string; phone: string } | null;
  venue: { id: string; name: string; color: string } | null;
  team: { id: string; name: string; color: string } | null;
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
  /** Yalnızca fotoğrafçıda dolu. */
  teams: Team[];
};
