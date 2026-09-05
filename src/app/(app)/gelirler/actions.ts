"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { paymentSchema, voidSchema, type PaymentInput } from "@/lib/schemas";
import { actionError, validationError, type ActionResult } from "@/lib/action-result";

function revalidateFinance(reservationId?: string | null) {
  revalidatePath("/gelirler");
  revalidatePath("/panel");
  revalidatePath("/raporlar");
  revalidatePath("/musteriler");
  revalidatePath("/rezervasyonlar");
  if (reservationId) revalidatePath(`/rezervasyonlar/${reservationId}`);
}

/**
 * Tahsilat kaydı oluşturur. Kayıtlar değiştirilemez olduğu için güncelleme
 * yoktur; hatalı kayıt voidPayment ile iptal edilip yenisi açılır.
 */
export async function createPayment(input: PaymentInput): Promise<ActionResult> {
  await requireSession();

  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);

  const supabase = await createClient();
  const { error } = await supabase.from("payments").insert(parsed.data);
  if (error) return actionError(error);

  revalidateFinance(parsed.data.reservation_id);
  return { ok: true };
}

/** Tahsilatı iptal eder (silmez). Denetim izi korunur. */
export async function voidPayment(
  id: string,
  reason: string,
): Promise<ActionResult> {
  await requireSession();

  const parsed = voidSchema.safeParse({ id, reason });
  if (!parsed.success) return validationError(parsed.error.issues);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .update({ voided_at: new Date().toISOString(), void_reason: parsed.data.reason })
    .eq("id", parsed.data.id)
    .select("reservation_id")
    .single();

  if (error) return actionError(error);

  revalidateFinance((data as { reservation_id: string | null }).reservation_id);
  return { ok: true };
}
