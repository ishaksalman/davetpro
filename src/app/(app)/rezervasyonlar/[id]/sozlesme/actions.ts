"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canSeeFinance, requireSession } from "@/lib/auth";
import { getReservationById } from "@/lib/queries";
import { todayISO } from "@/lib/time";
import {
  buildContractSnapshot,
  contractVariableValues,
  renderContractBody,
} from "@/lib/contracts";
import { contractTemplateSchema, voidSchema } from "@/lib/schemas";
import { actionError, validationError, type ActionResult } from "@/lib/action-result";
import type { Contract, ContractStatus, Customer } from "@/lib/database.types";

function revalidateContract(reservationId: string) {
  revalidatePath(`/rezervasyonlar/${reservationId}`);
  revalidatePath(`/rezervasyonlar/${reservationId}/sozlesme`);
}

/**
 * Sözleşmeyi oluşturur (veya yeni sürümünü açar).
 *
 * Finansal veriler rezervasyonun mevcut finans görünümünden okunup snapshot'a
 * yazılır — yeniden hesaplanmaz ve hiçbir tahsilat kaydı üretilmez.
 */
export async function createContract(
  reservationId: string,
  bodyOverride?: string,
): Promise<ActionResult<{ id: string }>> {
  const { profile, business } = await requireSession();
  if (!canSeeFinance(profile)) {
    return { ok: false, error: "Sözleşme oluşturmak için finansal yetki gerekir." };
  }

  const supabase = await createClient();
  const [{ reservation, error }, customerResult, templateResult] = await Promise.all([
    getReservationById(reservationId),
    supabase.from("customers").select("*").returns<Customer[]>(),
    supabase.from("contract_templates").select("body").limit(1).maybeSingle<{ body: string }>(),
  ]);

  if (error) return { ok: false, error };
  if (!reservation) return { ok: false, error: "Rezervasyon bulunamadı." };

  const customer = (customerResult.data ?? []).find(
    (c) => c.id === reservation.customer_id,
  );
  if (!customer) return { ok: false, error: "Müşteri bulunamadı." };

  const body = bodyOverride ?? templateResult.data?.body;
  if (!body) {
    return {
      ok: false,
      error: "Sözleşme şablonu bulunamadı. Ayarlar → Sözleşme'den metni tanımlayın.",
    };
  }

  const parsed = contractTemplateSchema.safeParse({ body });
  if (!parsed.success) return validationError(parsed.error.issues);

  const snapshot = buildContractSnapshot({
    business,
    customer,
    reservation,
    profile,
    today: todayISO(),
  });

  // Sözleşme numarası ancak veritabanında atanıyor; yer tutucu olduğu gibi
  // bırakılıp RPC tarafından dolduruluyor.
  const content = renderContractBody(
    parsed.data.body,
    contractVariableValues(snapshot, "{{contract_number}}"),
  );

  const { data, error: rpcError } = await supabase.rpc("create_contract", {
    p_reservation_id: reservationId,
    p_content: content,
    p_snapshot: snapshot,
  });

  if (rpcError) return actionError(rpcError);

  revalidateContract(reservationId);
  return { ok: true, data: { id: (data as Contract).id } };
}

export async function updateContractStatus(
  contractId: string,
  reservationId: string,
  status: Extract<ContractStatus, "olusturuldu" | "imzalandi">,
): Promise<ActionResult> {
  await requireSession();

  const supabase = await createClient();
  const { error } = await supabase
    .from("contracts")
    .update({
      status,
      signed_at: status === "imzalandi" ? new Date().toISOString() : null,
    })
    .eq("id", contractId);

  if (error) return actionError(error);

  revalidateContract(reservationId);
  return { ok: true };
}

/** Sözleşme silinmez; iptal edilir ve nedeni denetim izinde kalır. */
export async function cancelContract(
  contractId: string,
  reservationId: string,
  reason: string,
): Promise<ActionResult> {
  const { user } = await requireSession();

  const parsed = voidSchema.safeParse({ id: contractId, reason });
  if (!parsed.success) return validationError(parsed.error.issues);

  const supabase = await createClient();
  const { error } = await supabase
    .from("contracts")
    .update({
      status: "iptal",
      cancelled_at: new Date().toISOString(),
      cancelled_by: user.id,
      cancel_reason: parsed.data.reason,
    })
    .eq("id", contractId);

  if (error) return actionError(error);

  revalidateContract(reservationId);
  return { ok: true };
}
