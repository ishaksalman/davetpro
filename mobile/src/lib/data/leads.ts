import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Customer, Lead, LeadActivity, Profile, Quote, QuoteItem, VenueHold,
} from "@/lib/database.types";
import {
  convertLeadSchema, holdSchema, leadActivitySchema, leadLostSchema, quoteSchema,
  type ConvertLeadInput, type HoldInput, type LeadActivityInput, type LeadInput, type LeadLostInput, type QuoteInput,
} from "@/lib/schemas";
import { toTurkishError } from "@/lib/errors";
import { matchCustomerByPhone, prepareLead } from "../domain/leads";
import { supabase } from "../supabase";
import { fetchLookups, keys } from "./lookups";
import { QueryError, unwrap } from "./query-error";
import type { Lookups } from "./types";

export type LeadRow = Lead & {
  customer: { id: string; full_name: string; phone: string } | null;
  venue: { id: string; name: string; color: string } | null;
  package: { id: string; name: string } | null;
  quote_amount: number | null;
  quote_number: string | null;
  hold_expires_at: string | null;
  follow_up_overdue: boolean;
};

export type LeadScope = "acik" | "yeni" | "teklif_verildi" | "opsiyonlu" | "kazanildi" | "kaybedildi";
const PAGE = 25;

/** Süresi geçen opsiyon ve teklifleri kapatır (web `sweepExpired`): okumadan hemen önce. */
async function sweep() {
  await Promise.all([supabase.rpc("expire_venue_holds", { p_venue_id: null }), supabase.rpc("expire_quotes")]);
}

function toRows(leads: Lead[], lookups: Lookups, quotes: Pick<Quote, "lead_id" | "quote_number" | "total_amount" | "version">[], holds: Pick<VenueHold, "lead_id" | "expires_at">[]): LeadRow[] {
  const latest = new Map<string, { n: string; a: number }>();
  for (const q of [...quotes].sort((a, b) => b.version - a.version)) if (!latest.has(q.lead_id)) latest.set(q.lead_id, { n: q.quote_number, a: q.total_amount });
  const hold = new Map(holds.map((h) => [h.lead_id, h.expires_at] as const));
  const customers = new Map(lookups.customers.map((c) => [c.id, c] as const));
  const venues = new Map(lookups.venues.map((v) => [v.id, v] as const));
  const packages = new Map(lookups.packages.map((p) => [p.id, p] as const));
  const now = Date.now();
  return leads.map((l) => {
    const c = customers.get(l.customer_id);
    const v = l.venue_id ? venues.get(l.venue_id) : undefined;
    const p = l.package_id ? packages.get(l.package_id) : undefined;
    const q = latest.get(l.id);
    return {
      ...l,
      customer: c ? { id: c.id, full_name: c.full_name, phone: c.phone } : null,
      venue: v ? { id: v.id, name: v.name, color: v.color } : null,
      package: p ? { id: p.id, name: p.name } : null,
      quote_amount: q?.a ?? null,
      quote_number: q?.n ?? null,
      hold_expires_at: hold.get(l.id) ?? null,
      follow_up_overdue: l.next_follow_up_at !== null && l.status !== "kazanildi" && l.status !== "kaybedildi" && new Date(l.next_follow_up_at).getTime() < now,
    };
  });
}

export function useLeadList(scope: LeadScope, search: string) {
  return useInfiniteQuery({
    queryKey: ["leads", "list", scope, search.trim()],
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<{ rows: LeadRow[]; next: number | null }> => {
      await sweep();
      const lookups = await fetchLookups();
      let q = supabase.from("leads").select("*").order("created_at", { ascending: false });
      if (scope === "acik") q = q.not("status", "in", "(kazanildi,kaybedildi)");
      else q = q.eq("status", scope);

      const needle = search.trim().toLocaleLowerCase("tr-TR");
      if (needle) {
        const digits = needle.replace(/\D/g, "");
        const ids = lookups.customers
          .filter((c) => c.full_name.toLocaleLowerCase("tr-TR").includes(needle) || (digits.length >= 3 && c.phone.replace(/\D/g, "").includes(digits)))
          .map((c) => c.id);
        if (ids.length === 0) return { rows: [], next: null };
        q = q.in("customer_id", ids.slice(0, 200));
      }
      const from = pageParam * PAGE;
      const leads = unwrap(await q.range(from, from + PAGE - 1).returns<Lead[]>());
      const ids = leads.map((l) => l.id);
      const [quotes, holds] = ids.length
        ? await Promise.all([
            supabase.from("quotes").select("lead_id, quote_number, total_amount, version").in("lead_id", ids),
            supabase.from("venue_holds").select("lead_id, expires_at").eq("status", "aktif").in("lead_id", ids),
          ])
        : [{ data: [], error: null }, { data: [], error: null }];
      // Teklif tutarı finans yetkisi yoksa RLS ile boş gelir (hata değil).
      return {
        rows: toRows(leads, lookups, unwrap(quotes as never) as never, unwrap(holds as never) as never),
        next: leads.length === PAGE ? pageParam + 1 : null,
      };
    },
    getNextPageParam: (l) => l.next,
  });
}

export type LeadDetail = {
  lead: LeadRow;
  activities: LeadActivity[];
  quotes: Quote[];
  items: QuoteItem[];
  holds: VenueHold[];
  members: Pick<Profile, "id" | "full_name">[];
};

export function useLead(id: string) {
  return useQuery({
    queryKey: ["leads", "detail", id],
    queryFn: async (): Promise<LeadDetail | null> => {
      await sweep();
      const lookups = await fetchLookups();
      const lead = unwrap(await supabase.from("leads").select("*").eq("id", id).maybeSingle<Lead>());
      if (!lead) return null;
      const [activities, quotes, holds, members] = await Promise.all([
        supabase.from("lead_activities").select("*").eq("lead_id", id).order("occurred_at", { ascending: false }).returns<LeadActivity[]>(),
        supabase.from("quotes").select("*").eq("lead_id", id).order("version", { ascending: false }).returns<Quote[]>(),
        supabase.from("venue_holds").select("*").eq("lead_id", id).order("created_at", { ascending: false }).returns<VenueHold[]>(),
        supabase.from("profiles").select("id, full_name").eq("is_active", true).order("full_name").returns<Pick<Profile, "id" | "full_name">[]>(),
      ]);
      const qs = unwrap(quotes);
      const items = qs.length ? unwrap(await supabase.from("quote_items").select("*").in("quote_id", qs.map((q) => q.id)).order("sort_order").returns<QuoteItem[]>()) : [];
      const row = toRows([lead], lookups, qs, unwrap(holds).filter((h) => h.status === "aktif"))[0];
      return { lead: row, activities: unwrap(activities), quotes: qs, items, holds: unwrap(holds), members: unwrap(members) };
    },
  });
}

export function useMembers() {
  return useQuery({
    queryKey: ["members"],
    staleTime: 60_000,
    queryFn: async () => unwrap(await supabase.from("profiles").select("id, full_name").eq("is_active", true).order("full_name").returns<Pick<Profile, "id" | "full_name">[]>()),
  });
}

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const fail = (e: unknown): { ok: false; error: string } => ({ ok: false, error: toTurkishError(e) });

function useInvalidateLeads() {
  const qc = useQueryClient();
  return (id?: string) => {
    qc.invalidateQueries({ queryKey: ["leads"] });
    qc.invalidateQueries({ queryKey: ["calendar"] });
    qc.invalidateQueries({ queryKey: keys.dashboard });
    if (id) qc.invalidateQueries({ queryKey: ["leads", "detail", id] });
  };
}

/** Talep kaydı: müşteri seçilmediyse telefonla mevcut müşteri aranır, yoksa yeni açılır (web saveLead). */
export function useSaveLead() {
  const invalidate = useInvalidateLeads();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: LeadInput): Promise<Result<{ id: string }>> => {
      const p = prepareLead(input);
      if (!p.ok) return p;
      const v = p.value;
      let customerId = v.customer_id;
      if (!customerId) {
        const { data: customers, error: cErr } = await supabase.from("customers").select("id, full_name, phone").returns<Pick<Customer, "id" | "full_name" | "phone">[]>();
        if (cErr) return fail(cErr);
        const match = matchCustomerByPhone(customers ?? [], v.phone);
        if (match) customerId = match.id;
        else {
          const { data, error } = await supabase.from("customers").insert({ full_name: v.full_name, phone: v.phone, email: v.email }).select("id").single<{ id: string }>();
          if (error) return fail(error);
          customerId = data.id;
          qc.invalidateQueries({ queryKey: keys.lookups });
        }
      }
      const payload = {
        customer_id: customerId, organization_type: v.organization_type, source: v.source, venue_id: v.venue_id, package_id: v.package_id,
        event_date: v.event_date, start_time: v.start_time, end_time: v.end_time, guest_count: v.guest_count, assigned_to: v.assigned_to,
        next_follow_up_at: v.next_follow_up_at, notes: v.notes,
      };
      if (v.id) {
        const { error } = await supabase.from("leads").update(payload).eq("id", v.id);
        if (error) return fail(error);
        invalidate(v.id);
        return { ok: true, id: v.id };
      }
      const { data, error } = await supabase.from("leads").insert(payload).select("id").single<{ id: string }>();
      if (error) return fail(error);
      invalidate(data.id);
      return { ok: true, id: data.id };
    },
  });
}

export function useLeadActions(leadId: string) {
  const invalidate = useInvalidateLeads();
  const wrap = <A,>(fn: (a: A) => Promise<{ error: { message: string } | null } | Result>) =>
    useMutation({
      mutationFn: async (a: A): Promise<Result> => {
        try {
          const r = await fn(a);
          if ("ok" in r) return r as Result;
          if (r.error) return fail(r.error);
          invalidate(leadId);
          return { ok: true };
        } catch (e) {
          return fail(e);
        }
      },
    });

  const lost = wrap(async (input: LeadLostInput) => {
    const parsed = leadLostSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz veri." } as Result;
    const v = parsed.data;
    return supabase.from("leads").update({ status: "kaybedildi", lost_reason: v.lost_reason, lost_note: v.lost_note }).eq("id", v.lead_id).is("reservation_id", null);
  });
  const reopen = wrap(async (_: void) => {
    const { data: status, error } = await supabase.rpc("derived_lead_status", { p_lead_id: leadId });
    if (error) return { error };
    return supabase.from("leads").update({ status, lost_reason: null, lost_note: null }).eq("id", leadId).is("reservation_id", null);
  });
  const followUp = wrap(async (iso: string | null) => supabase.from("leads").update({ next_follow_up_at: iso || null }).eq("id", leadId));
  const activity = wrap(async (input: LeadActivityInput) => {
    const parsed = leadActivitySchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz veri." } as Result;
    const v = parsed.data;
    const at = v.occurred_at ?? new Date().toISOString();
    const r = await supabase.from("lead_activities").insert({ lead_id: v.lead_id, type: v.type, note: v.note, occurred_at: at });
    if (r.error) return r;
    // Görüşme kaydı aynı zamanda "son iletişim" demek.
    return supabase.from("leads").update({ last_contact_at: at }).eq("id", v.lead_id);
  });
  const quote = wrap(async (input: QuoteInput) => {
    const parsed = quoteSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz veri." } as Result;
    const v = parsed.data;
    // Numara tahsisi ve sürüm artışı save_quote() içinde, tek transaction'da.
    return supabase.rpc("save_quote", {
      p_lead_id: v.lead_id, p_venue_id: v.venue_id, p_package_id: v.package_id, p_guest_count: v.guest_count,
      p_package_amount: v.package_amount, p_discount_amount: v.discount_amount, p_valid_until: v.valid_until, p_notes: v.notes, p_items: v.items,
    });
  });
  const quoteStatus = wrap(async (a: { id: string; status: "gonderildi" | "kabul" | "reddedildi" }) =>
    supabase.from("quotes").update({
      status: a.status,
      sent_at: a.status === "gonderildi" ? new Date().toISOString() : undefined,
      decided_at: a.status === "gonderildi" ? null : new Date().toISOString(),
    }).eq("id", a.id),
  );
  const hold = wrap(async (input: HoldInput) => {
    const parsed = holdSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz veri." } as Result;
    const v = parsed.data;
    const r = await supabase.from("venue_holds").insert({
      lead_id: v.lead_id, venue_id: v.venue_id, event_date: v.event_date, start_time: v.start_time, end_time: v.end_time,
      expires_at: new Date(v.expires_at).toISOString(), note: v.note,
    });
    if (r.error) return r;
    return supabase.from("leads").update({ status: "opsiyonlu" }).eq("id", v.lead_id).in("status", ["yeni", "teklif_verildi"]);
  });
  const extendHold = wrap(async (a: { id: string; expiresAt: string }) => {
    const when = new Date(a.expiresAt);
    if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) return { ok: false, error: "Yeni opsiyon bitişi gelecekte olmalı." } as Result;
    return supabase.from("venue_holds").update({ expires_at: when.toISOString() }).eq("id", a.id).eq("status", "aktif");
  });
  const cancelHold = wrap(async (id: string) => supabase.from("venue_holds").update({ status: "iptal" }).eq("id", id).eq("status", "aktif"));
  return { lost, reopen, followUp, activity, quote, quoteStatus, hold, extendHold, cancelHold };
}

/** Talebi rezervasyona dönüştürür: tüm iş convert_lead_to_reservation() içinde, tek transaction'da. */
export function useConvertLead() {
  const invalidate = useInvalidateLeads();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ConvertLeadInput): Promise<Result<{ reservationId: string }>> => {
      const parsed = convertLeadSchema.safeParse(input);
      if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };
      const v = parsed.data;
      const { data, error } = await supabase.rpc("convert_lead_to_reservation", {
        p_lead_id: v.lead_id, p_quote_id: v.quote_id, p_venue_id: v.venue_id, p_package_id: v.package_id, p_event_date: v.event_date,
        p_start_time: v.start_time, p_end_time: v.end_time, p_guest_count: v.guest_count, p_gross_amount: v.gross_amount,
        p_discount_amount: v.discount_amount, p_deposit_amount: v.deposit_amount, p_due_date: v.due_date, p_notes: v.notes,
      });
      if (error) return fail(error);
      invalidate(v.lead_id);
      qc.invalidateQueries({ queryKey: keys.reservations });
      qc.invalidateQueries({ queryKey: ["finance"] });
      return { ok: true, reservationId: data as string };
    },
  });
}

export { QueryError };
