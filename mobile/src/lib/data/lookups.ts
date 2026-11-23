import { useQuery } from "@tanstack/react-query";
import type { Customer, Package, Team, Venue } from "@/lib/database.types";
import { supabase } from "../supabase";
import { unwrap } from "./query-error";
import type { Lookups } from "./types";

export const keys = {
  lookups: ["lookups"] as const,
  reservations: ["reservations"] as const,
  reservation: (id: string) => ["reservation", id] as const,
  dashboard: ["dashboard"] as const,
  expenseCategories: ["expense-categories"] as const,
};

/** Küçük sabit listeler (web getLookups ile aynı): formlar ve arama bunları kullanır. */
export async function fetchLookups(): Promise<Lookups> {
  const [customers, venues, packages, teams] = await Promise.all([
    supabase.from("customers").select("*").order("full_name").returns<Customer[]>(),
    supabase.from("venues").select("*").order("name").returns<Venue[]>(),
    supabase.from("packages").select("*").order("name").returns<Package[]>(),
    supabase.from("teams").select("*").order("name").returns<Team[]>(),
  ]);
  return { customers: unwrap(customers), venues: unwrap(venues), packages: unwrap(packages), teams: unwrap(teams) };
}

export function useLookups() {
  return useQuery({ queryKey: keys.lookups, queryFn: fetchLookups, staleTime: 60_000 });
}
