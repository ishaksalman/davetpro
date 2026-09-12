"use server";

import { requireSession } from "@/lib/auth";
import { getVenueAvailability, type AvailabilityQuery } from "@/lib/leads";

/**
 * Müsaitlik sorgusu — hem talep hem rezervasyon formundan çağrılıyor.
 *
 * Ortak bir yerde: bileşen iki modülde de kullanıldığı için eylemi birinin
 * klasöründe bırakmak, diğerinden klasörler arası içe aktarma gerektiriyordu.
 */
export async function checkAvailability(query: AvailabilityQuery) {
  await requireSession();
  return getVenueAvailability(query);
}
