import { createClient } from "@/lib/supabase/server";
import { toTurkishError } from "@/lib/errors";
import { getLookups, type Lookups } from "@/lib/queries";
import type { CalendarHold, CalendarLead } from "@/app/(app)/takvim/calendar-view";
import type {
  Lead,
  Profile,
  Quote,
  VenueAvailability,
  VenueHold,
} from "@/lib/database.types";

/**
 * Talep listesi satırı: kart ve tabloda gösterilen her şey tek nesnede.
 * Müşteri/salon/paket adları küçük tablolardan haritalanır — rezervasyon
 * tarafındaki yaklaşımın aynısı, gömülü join belirsizliği olmadan.
 */
export type LeadRow = Lead & {
  customer: { id: string; full_name: string; phone: string } | null;
  venue: { id: string; name: string; color: string } | null;
  package: { id: string; name: string } | null;
  assignee_name: string | null;
  /** En güncel teklifin tutarı. Finans yetkisi yoksa RLS gereği null. */
  quote_amount: number | null;
  quote_number: string | null;
  /** Süresi dolmamış opsiyonun bitiş zamanı. */
  hold_expires_at: string | null;
  /** Takip tarihi geçmiş mi? Sunucuda hesaplanır: istemcinin saatine güvenilmez. */
  follow_up_overdue: boolean;
};

export type LeadFilter = {
  id?: string;
  status?: string;
  organizationType?: string;
  venueId?: string;
  source?: string;
  assignedTo?: string;
  from?: string;
  to?: string;
  limit?: number;
};

/**
 * Süresi geçen opsiyon ve teklifleri kapatır.
 *
 * Sunucu tarafında, liste okunmadan hemen önce çalışır: "süresi doldu"
 * durumuna geçiş istemcinin saatine veya bir zamanlayıcıya bırakılmaz.
 */
async function sweepExpired(): Promise<void> {
  const supabase = await createClient();
  await Promise.all([
    supabase.rpc("expire_venue_holds", { p_venue_id: null }),
    supabase.rpc("expire_quotes"),
  ]);
}

export async function getLeadRows(
  filter: LeadFilter = {},
  lookups?: Lookups,
): Promise<{ rows: LeadRow[]; error: string | null; truncated: boolean }> {
  await sweepExpired();
  const supabase = await createClient();

  let query = supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (filter.id) query = query.eq("id", filter.id);
  if (filter.status) query = query.eq("status", filter.status);
  if (filter.organizationType)
    query = query.eq("organization_type", filter.organizationType);
  if (filter.venueId) query = query.eq("venue_id", filter.venueId);
  if (filter.source) query = query.eq("source", filter.source);
  if (filter.assignedTo) query = query.eq("assigned_to", filter.assignedTo);
  if (filter.from) query = query.gte("event_date", filter.from);
  if (filter.to) query = query.lte("event_date", filter.to);

  const limit = filter.limit ?? 2000;
  query = query.limit(limit);

  const [leadsResult, quotesResult, holdsResult, resolved, profilesResult] =
    await Promise.all([
      query.returns<Lead[]>(),
      // Tutarı yalnızca en güncel sürümden alıyoruz; sıralama burada yapılıp
      // aşağıda ilk görülen kayıt saklanıyor.
      supabase
        .from("quotes")
        .select("lead_id, quote_number, total_amount, version")
        .order("version", { ascending: false })
        .returns<Pick<Quote, "lead_id" | "quote_number" | "total_amount" | "version">[]>(),
      supabase
        .from("venue_holds")
        .select("lead_id, expires_at, status")
        .eq("status", "aktif")
        .returns<Pick<VenueHold, "lead_id" | "expires_at" | "status">[]>(),
      lookups ? Promise.resolve(lookups) : getLookups(),
      supabase.from("profiles").select("id, full_name").returns<Profile[]>(),
    ]);

  if (leadsResult.error) {
    return { rows: [], error: toTurkishError(leadsResult.error), truncated: false };
  }

  const latestQuote = new Map<string, { number: string; amount: number }>();
  for (const q of quotesResult.data ?? []) {
    if (!latestQuote.has(q.lead_id)) {
      latestQuote.set(q.lead_id, { number: q.quote_number, amount: q.total_amount });
    }
  }
  const holds = new Map(
    (holdsResult.data ?? []).map((h) => [h.lead_id, h.expires_at] as const),
  );
  const customers = new Map(resolved.customers.map((c) => [c.id, c] as const));
  const venues = new Map(resolved.venues.map((v) => [v.id, v] as const));
  const packages = new Map(resolved.packages.map((p) => [p.id, p] as const));
  const people = new Map(
    (profilesResult.data ?? []).map((p) => [p.id, p.full_name] as const),
  );

  const now = Date.now();
  const rows = (leadsResult.data ?? []).map<LeadRow>((lead) => {
    const customer = customers.get(lead.customer_id);
    const venue = lead.venue_id ? venues.get(lead.venue_id) : undefined;
    const pkg = lead.package_id ? packages.get(lead.package_id) : undefined;
    const quote = latestQuote.get(lead.id);

    return {
      ...lead,
      customer: customer
        ? { id: customer.id, full_name: customer.full_name, phone: customer.phone }
        : null,
      venue: venue ? { id: venue.id, name: venue.name, color: venue.color } : null,
      package: pkg ? { id: pkg.id, name: pkg.name } : null,
      assignee_name: lead.assigned_to ? (people.get(lead.assigned_to) ?? null) : null,
      quote_amount: quote?.amount ?? null,
      quote_number: quote?.number ?? null,
      hold_expires_at: holds.get(lead.id) ?? null,
      follow_up_overdue:
        lead.next_follow_up_at !== null &&
        lead.status !== "kazanildi" &&
        lead.status !== "kaybedildi" &&
        new Date(lead.next_follow_up_at).getTime() < now,
    };
  });

  return { rows, error: null, truncated: rows.length >= limit };
}

export async function getLeadById(
  id: string,
): Promise<{ lead: LeadRow | null; error: string | null }> {
  const { rows, error } = await getLeadRows({ id, limit: 1 });
  return { lead: rows[0] ?? null, error };
}

/**
 * Takvimde gösterilecek aktif opsiyonlar.
 * Süresi geçmiş olanlar önce kapatılır, sonra listelenir.
 */
export async function getActiveHolds(): Promise<CalendarHold[]> {
  await sweepExpired();
  const supabase = await createClient();

  const [holdsResult, lookups] = await Promise.all([
    supabase
      .from("venue_holds")
      .select("*")
      .eq("status", "aktif")
      .returns<VenueHold[]>(),
    getLookups(),
  ]);

  if (holdsResult.error) return [];

  const leadIds = [...new Set((holdsResult.data ?? []).map((h) => h.lead_id))];
  if (leadIds.length === 0) return [];

  const { data: leads } = await supabase
    .from("leads")
    .select("id, customer_id")
    .in("id", leadIds)
    .returns<Pick<Lead, "id" | "customer_id">[]>();

  const leadCustomer = new Map((leads ?? []).map((l) => [l.id, l.customer_id] as const));
  const customers = new Map(lookups.customers.map((c) => [c.id, c.full_name] as const));
  const venues = new Map(lookups.venues.map((v) => [v.id, v.color] as const));

  return (holdsResult.data ?? []).map((hold) => ({
    id: hold.id,
    lead_id: hold.lead_id,
    venue_id: hold.venue_id,
    event_date: hold.event_date,
    start_time: hold.start_time,
    starts_at: startsAt(hold),
    ends_at: endsAt(hold),
    expires_at: hold.expires_at,
    customer_name:
      customers.get(leadCustomer.get(hold.lead_id) ?? "") ?? "Talep",
    venue_color: venues.get(hold.venue_id) ?? "#6366f1",
  }));
}

/** Rezervasyondaki starts_at/ends_at ile aynı biçim: "YYYY-MM-DD HH:mm:ss". */
function startsAt(hold: VenueHold): string {
  return `${hold.event_date} ${hold.start_time}`;
}

function endsAt(hold: VenueHold): string {
  // Gece yarısını aşan opsiyon ertesi güne taşar.
  if (hold.end_time <= hold.start_time) {
    const next = new Date(`${hold.event_date}T00:00:00`);
    next.setDate(next.getDate() + 1);
    return `${next.toISOString().slice(0, 10)} ${hold.end_time}`;
  }
  return `${hold.event_date} ${hold.end_time}`;
}

/**
 * Takvimde gösterilecek açık talepler.
 *
 * Talep salonu bloke etmez; takvimde yalnızca "bu tarihe ilgi var" bilgisi
 * olarak duruyor. Kazanılan talep rezervasyon, opsiyonlu talep opsiyon olarak
 * zaten çizildiği için ikisi de burada tekrarlanmıyor; kaybedilenler arşiv.
 */
export async function getCalendarLeads(): Promise<CalendarLead[]> {
  const supabase = await createClient();

  const [leadsResult, lookups] = await Promise.all([
    supabase
      .from("leads")
      .select("*")
      .not("event_date", "is", null)
      // 'opsiyonlu' dışarıda: durum türetilmiş olduğu için bu tam olarak
      // "aktif opsiyonu var" demek ve o kayıt takvimde opsiyon olarak zaten
      // çiziliyor. İkisini birden göstermek aynı organizasyonu iki kez
      // gösterirdi.
      .not("status", "in", "(kazanildi,kaybedildi,opsiyonlu)")
      .returns<Lead[]>(),
    getLookups(),
  ]);

  if (leadsResult.error) return [];

  const customers = new Map(lookups.customers.map((c) => [c.id, c.full_name] as const));
  const venues = new Map(lookups.venues.map((v) => [v.id, v] as const));

  return (leadsResult.data ?? []).map((lead) => {
    const venue = lead.venue_id ? venues.get(lead.venue_id) : undefined;
    // Saati belirsiz talepler takvimde tüm gün olarak duruyor; uydurma bir
    // saat aralığı göstermek yanlış bilgi verirdi.
    const allDay = !lead.start_time || !lead.end_time;

    return {
      id: lead.id,
      venue_id: lead.venue_id,
      venue_name: venue?.name ?? null,
      venue_color: venue?.color ?? null,
      event_date: lead.event_date!,
      start_time: lead.start_time,
      all_day: allDay,
      starts_at: allDay
        ? `${lead.event_date} 00:00:00`
        : `${lead.event_date} ${lead.start_time}`,
      ends_at: allDay
        ? `${lead.event_date} 23:59:00`
        : leadEndsAt(lead.event_date!, lead.start_time!, lead.end_time!),
      customer_name: customers.get(lead.customer_id) ?? "Talep",
      status: lead.status,
    };
  });
}

function leadEndsAt(date: string, start: string, end: string): string {
  if (end <= start) {
    const next = new Date(`${date}T00:00:00`);
    next.setDate(next.getDate() + 1);
    return `${next.toISOString().slice(0, 10)} ${end}`;
  }
  return `${date} ${end}`;
}

/**
 * Salon müsaitliği. Kaynak yine rezervasyonlar ve aktif opsiyonlar; ayrı bir
 * müsaitlik defteri tutulmuyor.
 */
export async function getVenueAvailability(
  eventDate: string,
  /** Boşsa günün tamamı kontrol edilir. */
  startTime: string | null,
  endTime: string | null,
  /** Düzenlenen talebin kendi opsiyonu "dolu" görünmesin. */
  ignoreLeadId?: string | null,
): Promise<{ rows: VenueAvailability[]; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("venue_availability", {
    p_event_date: eventDate,
    p_start_time: startTime || null,
    p_end_time: endTime || null,
    p_ignore_lead_id: ignoreLeadId ?? null,
  });

  // Ham PostgREST metni kullanıcıya gösterilmez; hata yutulmaz da.
  if (error) return { rows: [], error: toTurkishError(error) };
  return { rows: (data ?? []) as VenueAvailability[], error: null };
}
