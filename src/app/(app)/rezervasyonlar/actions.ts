"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canSeeFinance, requireSession } from "@/lib/auth";
import { reservationSchema, type ReservationInput } from "@/lib/schemas";
import { actionError, validationError, type ActionResult } from "@/lib/action-result";
import { todayISO } from "@/lib/time";
import { STAGES, type Stage } from "@/lib/stage";
import type { ReservationStatus } from "@/lib/database.types";

function revalidateReservation(id?: string) {
  revalidatePath("/rezervasyonlar");
  revalidatePath("/takvim");
  revalidatePath("/panel");
  revalidatePath("/raporlar");
  if (id) revalidatePath(`/rezervasyonlar/${id}`);
}

/**
 * Rezervasyonu ve fiyatını tek transaction'da kaydeder (save_reservation RPC).
 * Yeni kayıtta kapora girildiyse ilk tahsilat da oluşturulur.
 */
export async function saveReservation(
  input: ReservationInput,
): Promise<ActionResult<{ id: string }>> {
  const { profile } = await requireSession();

  const parsed = reservationSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);

  const v = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("save_reservation", {
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
    // p_gross_amount, veritabanı tarafında PAKET tutarı olarak okunuyor;
    // brütü kalemleri ekleyerek orada hesaplıyor (0030).
    p_gross_amount: v.package_amount,
    p_items: v.items,
    p_discount_amount: v.discount_amount,
    p_due_date: v.due_date,
    p_unit_price: v.pricing_type === "kisi_basi" ? (v.unit_price ?? null) : null,
  });

  if (error) return actionError(error);
  const reservationId = data as string;

  // Kapora, yeni kayıtta da düzenlemede de tahsilat açabiliyor: para
  // sonradan da alınabiliyor. Her seferinde AYRI bir satır oluşuyor, mevcut
  // tahsilat değiştirilmiyor — payments değiştirilemez.
  const deposit = v.deposit_amount ?? 0;
  if (deposit > 0 && canSeeFinance(profile)) {
    const { error: paymentError } = await supabase.from("payments").insert({
      reservation_id: reservationId,
      customer_id: v.customer_id,
      amount: Math.round(deposit * 100) / 100,
      payment_date: todayISO(),
      category: "kapora",
      method: "nakit",
      description: v.id ? "Sonradan alınan kapora" : "Rezervasyon sırasında alınan kapora",
    });

    if (paymentError) {
      revalidateReservation(reservationId);
      return {
        ok: false,
        error: `Kayıt yapıldı ancak kapora tahsilatı eklenemedi: ${paymentError.message}`,
      };
    }
  }

  revalidateReservation(reservationId);
  return { ok: true, data: { id: reservationId } };
}

export async function updateReservationStatus(
  id: string,
  status: ReservationStatus,
): Promise<ActionResult> {
  await requireSession();

  const supabase = await createClient();
  const { error } = await supabase.from("reservations").update({ status }).eq("id", id);
  if (error) return actionError(error);

  revalidateReservation(id);
  return { ok: true };
}

/**
 * Fotoğrafçıda tek menüden gelen birleşik aşama.
 *
 * İki kolonu TEK update ile yazıyor: ayrı ayrı yazılsaydı arada kalan an
 * tutarsız görünürdü (ör. durum tamamlandı ama teslim aşaması boş).
 *
 * delivered_at elle yazılmıyor; veritabanı tetikleyicisi damgalıyor.
 */
export async function updateReservationStage(
  id: string,
  stage: Stage,
): Promise<ActionResult> {
  await requireSession();

  const hedef = STAGES[stage];
  if (!hedef) return { ok: false, error: "Geçersiz durum." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("reservations")
    .update(hedef.writes)
    .eq("id", id);
  if (error) return actionError(error);

  revalidateReservation(id);
  // Teslimat panosu bu kayda göre değişiyor.
  revalidatePath("/teslimat");
  return { ok: true };
}

export async function deleteReservation(id: string): Promise<ActionResult> {
  await requireSession();

  const supabase = await createClient();
  const { error } = await supabase.from("reservations").delete().eq("id", id);
  if (error) return actionError(error);

  revalidateReservation();
  return { ok: true };
}
