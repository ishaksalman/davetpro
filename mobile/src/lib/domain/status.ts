import { RESERVATION_STATUS_LABELS } from "@/lib/constants";
import { STAGES, reservationStage } from "@/lib/stage";
import { isShootOver } from "@/lib/time";
import type { DeliveryStatus, ReservationStatus } from "@/lib/database.types";
import type { Vertical } from "@/lib/vertical";
import type { Tone } from "~/ui/Badge";

const DELIVERY_TONE: Record<string, Tone> = {
  olusturuldu: "success",
  cekim_yapildi: "neutral",
  secim_bekleniyor: "warning",
  duzenleniyor: "info",
  baskida: "violet",
  teslim_edildi: "success",
  iptal_edildi: "danger",
};

const STATUS_TONE: Record<ReservationStatus, Tone> = {
  kesinlesti: "success",
  tamamlandi: "info",
  iptal_edildi: "danger",
};

/**
 * Rezervasyon rozeti — web `StageBadge` ile aynı kural: fotoğrafçıda birleşik
 * eksen (Baskıda, Teslim edildi…; tarihi geçen iş "Çekim yapıldı" görünür),
 * diğerlerinde düz durum. Etiketler ortak sözlükten gelir.
 */
export function reservationBadge(
  r: { status: ReservationStatus; delivery_status: DeliveryStatus | null; event_date: string; start_time: string; end_time: string },
  v: Pick<Vertical, "usesDelivery">,
  now: Date = new Date(),
): { label: string; tone: Tone } {
  if (v.usesDelivery) {
    const stage = reservationStage(r.status, r.delivery_status, isShootOver(r.event_date, r.end_time, r.start_time, now));
    return { label: STAGES[stage].label, tone: DELIVERY_TONE[stage] ?? "neutral" };
  }
  return { label: RESERVATION_STATUS_LABELS[r.status], tone: STATUS_TONE[r.status] };
}

/** Meta satırı: "Düğün · 19:00–23:30 · 350 kişi" (alanlar vertical'e göre). */
export function reservationMeta(
  r: { organization_type: string; start_time: string; end_time: string; guest_count: number | null; location: string | null },
  typeLabel: string,
  v: Pick<Vertical, "usesGuestCount" | "usesLocation">,
  fmtTime: (s: string) => string,
  fmtNumber: (n: number) => string,
): string {
  const parts = [typeLabel, `${fmtTime(r.start_time)}–${fmtTime(r.end_time)}`];
  if (v.usesGuestCount && r.guest_count) parts.push(`${fmtNumber(r.guest_count)} kişi`);
  return parts.join(" · ");
}

export type PaymentState = { label: string; tone: Tone };

/**
 * Ödeme durumu rozeti (Figma "Payment Summary"): kalan bakiye hata değildir;
 * yalnızca vadesi geçmişse Warning. Net 0 ise (fiyat girilmemiş) rozet yok.
 */
export function paymentState(
  r: { net_amount: number; collected_amount: number; balance_amount: number; due_date: string | null },
  todayISO: string,
): PaymentState | null {
  if (r.net_amount <= 0) return null;
  if (r.balance_amount <= 0) return { label: "Tamamı ödendi", tone: "success" };
  if (r.due_date && r.due_date < todayISO) return { label: "Vadesi geçti", tone: "warning" };
  if (r.collected_amount > 0) return { label: "Kısmi ödendi", tone: "warning" };
  return { label: "Ödeme bekliyor", tone: "neutral" };
}
