"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canSeeFinance, requireSession } from "@/lib/auth";
import {
  convertLeadSchema,
  holdSchema,
  leadActivitySchema,
  leadLostSchema,
  leadSchema,
  quoteSchema,
  type ConvertLeadInput,
  type HoldInput,
  type LeadActivityInput,
  type LeadInput,
  type LeadLostInput,
  type QuoteInput,
} from "@/lib/schemas";
import { actionError, validationError, type ActionResult } from "@/lib/action-result";
import type { Customer, Quote } from "@/lib/database.types";

function revalidateLead(id?: string) {
  revalidatePath("/talepler");
  revalidatePath("/panel");
  if (id) revalidatePath(`/talepler/${id}`);
}

/** Telefon numarasını karşılaştırma için sadeleştirir (yalnızca rakamlar). */
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Aynı telefonla kayıtlı müşteriyi arar.
 * Numara biçimi (boşluk, +90, 0 öneki) farklı girilmiş olabileceği için
 * karşılaştırma son 10 hane üzerinden yapılır.
 */
export async function findCustomerByPhone(
  phone: string,
): Promise<{ customer: Pick<Customer, "id" | "full_name" | "phone"> | null }> {
  await requireSession();
  const digits = normalizePhone(phone);
  if (digits.length < 10) return { customer: null };

  const supabase = await createClient();
  const { data } = await supabase
    .from("customers")
    .select("id, full_name, phone")
    .returns<Pick<Customer, "id" | "full_name" | "phone">[]>();

  const tail = digits.slice(-10);
  const match = (data ?? []).find((c) => normalizePhone(c.phone).slice(-10) === tail);
  return { customer: match ?? null };
}

/**
 * Talebi kaydeder. Müşteri seçilmediyse yeni müşteri açılır; mükerrer kayıt
 * oluşmasın diye telefon numarası önce mevcut müşterilerde aranır.
 */
export async function saveLead(
  input: LeadInput,
): Promise<ActionResult<{ id: string }>> {
  await requireSession();

  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);
  const v = parsed.data;

  const supabase = await createClient();

  let customerId = v.customer_id;
  if (!customerId) {
    const { customer } = await findCustomerByPhone(v.phone);
    if (customer) {
      customerId = customer.id;
    } else {
      const { data, error } = await supabase
        .from("customers")
        .insert({
          full_name: v.full_name,
          phone: v.phone,
          phone2: v.phone2,
          email: v.email,
        })
        .select("id")
        .single<{ id: string }>();
      if (error) return actionError(error);
      customerId = data.id;
    }
  }

  const payload = {
    customer_id: customerId,
    organization_type: v.organization_type,
    source: v.source,
    venue_id: v.venue_id,
    package_id: v.package_id,
    event_date: v.event_date,
    start_time: v.start_time,
    end_time: v.end_time,
    guest_count: v.guest_count,
    assigned_to: v.assigned_to,
    next_follow_up_at: v.next_follow_up_at,
    notes: v.notes,
  };

  if (v.id) {
    const { error } = await supabase.from("leads").update(payload).eq("id", v.id);
    if (error) return actionError(error);
    revalidateLead(v.id);
    return { ok: true, data: { id: v.id } };
  }

  const { data, error } = await supabase
    .from("leads")
    .insert(payload)
    .select("id")
    .single<{ id: string }>();

  if (error) return actionError(error);
  revalidateLead(data.id);
  return { ok: true, data: { id: data.id } };
}

/**
 * Kanban'da sürükle-bırak ve durum menüsü buraya bağlı.
 * "Kaybedildi" buradan seçilemez — neden zorunlu olduğu için ayrı akışı var.
 */

export async function markLeadLost(input: LeadLostInput): Promise<ActionResult> {
  await requireSession();

  const parsed = leadLostSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .update({
      status: "kaybedildi",
      lost_reason: v.lost_reason,
      lost_note: v.lost_note,
    })
    .eq("id", v.lead_id)
    .is("reservation_id", null);

  if (error) return actionError(error);
  revalidateLead(v.lead_id);
  return { ok: true };
}

/**
 * Talebi yeniden satış hattına alır (yanlışlıkla kaybedildi işaretlenmişse).
 * Hangi adıma döneceğini sistem belirler: teklifi varsa "Teklif verildi",
 * aktif opsiyonu varsa "Opsiyonlu", yoksa "Yeni talep".
 */
export async function reopenLead(id: string): Promise<ActionResult> {
  await requireSession();

  const supabase = await createClient();
  const { data: status, error: statusError } = await supabase.rpc(
    "derived_lead_status",
    { p_lead_id: id },
  );
  if (statusError) return actionError(statusError);

  const { error } = await supabase
    .from("leads")
    .update({ status, lost_reason: null, lost_note: null })
    .eq("id", id)
    .is("reservation_id", null);

  if (error) return actionError(error);
  revalidateLead(id);
  return { ok: true };
}

export async function setFollowUp(
  id: string,
  nextFollowUpAt: string | null,
): Promise<ActionResult> {
  await requireSession();

  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .update({ next_follow_up_at: nextFollowUpAt || null })
    .eq("id", id);

  if (error) return actionError(error);
  revalidateLead(id);
  return { ok: true };
}

export async function addLeadActivity(
  input: LeadActivityInput,
): Promise<ActionResult> {
  await requireSession();

  const parsed = leadActivitySchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("lead_activities").insert({
    lead_id: v.lead_id,
    type: v.type,
    note: v.note,
    occurred_at: v.occurred_at ?? new Date().toISOString(),
  });

  if (error) return actionError(error);

  // Görüşme kaydı aynı zamanda "son iletişim" demek.
  await supabase
    .from("leads")
    .update({ last_contact_at: v.occurred_at ?? new Date().toISOString() })
    .eq("id", v.lead_id);

  revalidateLead(v.lead_id);
  return { ok: true };
}

/**
 * Teklif oluşturur. Numara tahsisi ve sürüm artışı save_quote() içinde,
 * tek transaction'da yapılır. Teklif hiçbir gelir/tahsilat kaydı üretmez.
 */
export async function createQuote(
  input: QuoteInput,
): Promise<ActionResult<{ id: string }>> {
  const { profile } = await requireSession();
  if (!canSeeFinance(profile)) {
    return { ok: false, error: "Teklif oluşturmak için finansal yetki gerekir." };
  }

  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);
  const v = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_quote", {
    p_lead_id: v.lead_id,
    p_venue_id: v.venue_id,
    p_package_id: v.package_id,
    p_guest_count: v.guest_count,
    p_package_amount: v.package_amount,
    p_discount_amount: v.discount_amount,
    p_valid_until: v.valid_until,
    p_notes: v.notes,
    p_items: v.items,
  });

  if (error) return actionError(error);
  revalidateLead(v.lead_id);
  return { ok: true, data: { id: (data as Quote).id } };
}

export async function updateQuoteStatus(
  quoteId: string,
  leadId: string,
  status: "gonderildi" | "kabul" | "reddedildi",
): Promise<ActionResult> {
  const { profile } = await requireSession();
  if (!canSeeFinance(profile)) {
    return { ok: false, error: "Bu işlem için finansal yetki gerekir." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("quotes")
    .update({
      status,
      sent_at: status === "gonderildi" ? new Date().toISOString() : undefined,
      decided_at: status === "gonderildi" ? null : new Date().toISOString(),
    })
    .eq("id", quoteId);

  if (error) return actionError(error);
  revalidateLead(leadId);
  return { ok: true };
}

/** Tarihi opsiyona alır. Çakışma denetimi veritabanı trigger'ında. */
export async function createHold(input: HoldInput): Promise<ActionResult> {
  await requireSession();

  const parsed = holdSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("venue_holds").insert({
    lead_id: v.lead_id,
    venue_id: v.venue_id,
    event_date: v.event_date,
    start_time: v.start_time,
    end_time: v.end_time,
    expires_at: new Date(v.expires_at).toISOString(),
    note: v.note,
  });

  if (error) return actionError(error);

  await supabase
    .from("leads")
    .update({ status: "opsiyonlu" })
    .eq("id", v.lead_id)
    .in("status", ["yeni", "teklif_verildi"]);

  revalidateLead(v.lead_id);
  revalidatePath("/takvim");
  return { ok: true };
}

export async function extendHold(
  holdId: string,
  leadId: string,
  expiresAt: string,
): Promise<ActionResult> {
  await requireSession();

  const when = new Date(expiresAt);
  if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) {
    return { ok: false, error: "Yeni opsiyon bitişi gelecekte olmalı." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("venue_holds")
    .update({ expires_at: when.toISOString() })
    .eq("id", holdId)
    .eq("status", "aktif");

  if (error) return actionError(error);
  revalidateLead(leadId);
  revalidatePath("/takvim");
  return { ok: true };
}

export async function cancelHold(
  holdId: string,
  leadId: string,
): Promise<ActionResult> {
  await requireSession();

  const supabase = await createClient();
  const { error } = await supabase
    .from("venue_holds")
    .update({ status: "iptal" })
    .eq("id", holdId)
    .eq("status", "aktif");

  if (error) return actionError(error);
  revalidateLead(leadId);
  revalidatePath("/takvim");
  return { ok: true };
}

/**
 * Talebi rezervasyona dönüştürür.
 *
 * Tüm iş convert_lead_to_reservation() içinde, tek transaction'da: opsiyon
 * kapatılır, mevcut save_reservation() ile rezervasyon açılır, kapora bir kez
 * yazılır, teklif ve talep durumları güncellenir. Burada paralel bir
 * rezervasyon oluşturma yolu yok.
 */
export async function convertLead(
  input: ConvertLeadInput,
): Promise<ActionResult<{ reservationId: string }>> {
  await requireSession();

  const parsed = convertLeadSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);
  const v = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("convert_lead_to_reservation", {
    p_lead_id: v.lead_id,
    p_quote_id: v.quote_id,
    p_venue_id: v.venue_id,
    p_package_id: v.package_id,
    p_event_date: v.event_date,
    p_start_time: v.start_time,
    p_end_time: v.end_time,
    p_guest_count: v.guest_count,
    p_gross_amount: v.gross_amount,
    p_discount_amount: v.discount_amount,
    p_deposit_amount: v.deposit_amount,
    p_due_date: v.due_date,
    p_notes: v.notes,
  });

  if (error) return actionError(error);

  revalidateLead(v.lead_id);
  revalidatePath("/rezervasyonlar");
  revalidatePath("/takvim");
  revalidatePath("/gelirler");
  revalidatePath("/raporlar");
  return { ok: true, data: { reservationId: data as string } };
}

/** Talep formundaki ve dönüştürme ekranındaki müsaitlik rozeti için. */
export async function checkAvailability(
  eventDate: string,
  startTime: string | null,
  endTime: string | null,
  ignoreLeadId?: string | null,
) {
  await requireSession();
  const { getVenueAvailability } = await import("@/lib/leads");
  return getVenueAvailability(eventDate, startTime, endTime, ignoreLeadId);
}
