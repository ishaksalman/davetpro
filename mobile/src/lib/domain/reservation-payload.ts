import { reservationSchema, type ReservationInput } from "@/lib/schemas";
import { toTurkishError } from "@/lib/errors";

/**
 * `save_reservation` RPC argümanları — web `saveReservation` eyleminin birebir
 * karşılığı (src/app/(app)/rezervasyonlar/actions.ts). Kurallar:
 *  - p_gross_amount PAKET tutarıdır; brüt = paket + kalemler RPC içinde hesaplanır.
 *  - Kişi başı değilse birim fiyat null gider.
 *  - Kapora RPC'ye girmez; ayrı `payments` kaydıdır (kategori "kapora").
 */
export type SaveReservationArgs = {
  p_id: string | null; p_customer_id: string; p_venue_id: string; p_package_id: string | null;
  p_organization_type: string; p_status: string; p_event_date: string; p_start_time: string; p_end_time: string;
  p_guest_count: number | null; p_notes: string | null; p_location: string | null; p_team_id: string | null;
  p_gross_amount: number | null; p_items: { name: string; amount: number }[]; p_discount_amount: number;
  p_due_date: string | null; p_unit_price: number | null;
};

export type PreparedReservation =
  | { ok: true; args: SaveReservationArgs; deposit: number; customerId: string }
  | { ok: false; error: string };

/**
 * Formu doğrular ve RPC yükünü üretir.
 *
 * Finans yetkisi olmayan kullanıcı: şema "Fiyat girin." kuralını fiyat alanı
 * hiç gösterilmediği için ihlal ederdi. Bu kullanıcıda fiyat yazılmaz (RPC
 * `can_see_finance()` ile zaten yok sayar); doğrulama için yer tutucu fiyatla
 * yapılır ve `p_gross_amount` NULL gönderilir.
 */
export function prepareReservation(input: ReservationInput, canFinance: boolean): PreparedReservation {
  const candidate: ReservationInput = canFinance
    ? input
    : { ...input, package_amount: 1, items: [], discount_amount: 0, deposit_amount: 0, pricing_type: "sabit", unit_price: null };

  const parsed = reservationSchema.safeParse(candidate);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };
  const v = parsed.data;

  return {
    ok: true,
    customerId: v.customer_id,
    deposit: canFinance ? Math.round((v.deposit_amount ?? 0) * 100) / 100 : 0,
    args: {
      p_id: v.id ?? null,
      p_customer_id: v.customer_id,
      p_venue_id: v.venue_id,
      p_package_id: v.package_id,
      p_organization_type: v.organization_type,
      p_status: v.status,
      p_event_date: v.event_date,
      p_start_time: v.start_time,
      p_end_time: v.end_time,
      p_guest_count: v.guest_count,
      p_notes: v.notes,
      p_location: v.location,
      p_team_id: v.team_id,
      p_gross_amount: canFinance ? v.package_amount : null,
      p_items: canFinance ? v.items : [],
      p_discount_amount: canFinance ? v.discount_amount : 0,
      p_due_date: canFinance ? v.due_date : null,
      p_unit_price: canFinance && v.pricing_type === "kisi_basi" ? (v.unit_price ?? null) : null,
    },
  };
}

/** Kişi başı fiyat: toplam = birim × kişi (kuruşa yuvarlı). */
export function perGuestTotal(unitPrice: number, guestCount: number): number {
  return Math.round(unitPrice * guestCount * 100) / 100;
}

/**
 * Brüt / net tutarlar — kuruş tamsayısı üzerinden (kayan nokta birikimi yok).
 * Form özeti ve doğrulama için; kaydedilen gerçek tutar yine veritabanındadır.
 */
export function pricingTotals(packageAmount: number, itemAmounts: number[], discount: number) {
  const k = (n: number) => Math.round(n * 100);
  const gross = k(packageAmount) + itemAmounts.reduce((s, a) => s + k(a), 0);
  const net = Math.max(0, gross - k(discount));
  return { gross: gross / 100, net: net / 100, extras: (gross - k(packageAmount)) / 100 };
}

export { toTurkishError };
