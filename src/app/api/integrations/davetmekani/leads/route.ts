import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { dogrula } from "@/lib/integrations/signature";
import { DAVETMEKANI_SOURCE, organizasyonTuru } from "@/lib/integrations/davetmekani";

/**
 * DavetMekanı'ndan gelen teklif talepleri.
 *
 * Canlı gönderim ve geçmiş toplu aktarım aynı uç noktayı kullanır.
 * Idempotency `external_id` ile: aynı talep iki kez lead üretmez, ve
 * aktarımdan sonra bu tarafta yapılan çalışma ezilmez.
 *
 * Kontrat: ~/Desktop/davet/davetmekani/docs/DAVETPRO-ENTEGRASYON.md
 */

const leadSchema = z.object({
  external_id: z.string().min(1).max(128),
  davetpro_venue_id: z.string().uuid().nullish(),
  full_name: z.string().trim().min(2).max(160),
  phone: z.string().trim().min(7).max(20),
  email: z.string().trim().email().nullish().catch(null),
  event_type_slug: z.string().max(80).nullish(),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  guest_count: z.number().int().positive().max(100000).nullish(),
  message: z.string().max(4000).nullish(),
  created_at: z.string().nullish(),
});

const bodySchema = z.object({
  v: z.literal(1),
  business_id: z.string().uuid(),
  // Toplu aktarımın üst sınırı; kontratta 200 olarak yazılı.
  leads: z.array(leadSchema).min(1).max(200),
});

export async function POST(request: Request) {
  // İmza HAM gövde üzerinden doğrulanıyor; önce metin olarak okuyoruz.
  const raw = await request.text();

  const imza = dogrula(raw, request.headers, process.env.DAVETPRO_INTEGRATION_SECRET);
  if (!imza.ok) {
    return NextResponse.json({ ok: false, error: imza.mesaj }, { status: imza.kod });
  }

  let parsed;
  try {
    parsed = bodySchema.safeParse(JSON.parse(raw));
  } catch {
    return NextResponse.json({ ok: false, error: "Gövde JSON değil." }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Geçersiz gövde.", issues: parsed.error.issues.slice(0, 5) },
      { status: 400 },
    );
  }

  const { business_id, leads } = parsed.data;
  const supabase = createAdminClient();

  // İşletme gerçekten var mı? Yoksa uydurma bir business_id ile veri
  // yazılmasına izin vermiş oluruz.
  const { data: business, error: bizError } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", business_id)
    .maybeSingle();
  if (bizError) {
    console.error("[integrations/leads] işletme sorgusu", bizError.message);
    return NextResponse.json({ ok: false, error: "Sunucu hatası." }, { status: 500 });
  }
  if (!business) {
    return NextResponse.json({ ok: false, error: "İşletme bulunamadı." }, { status: 404 });
  }

  const results: { external_id: string; lead_id: string | null; created: boolean }[] = [];

  for (const lead of leads) {
    const { data, error } = await supabase.rpc("upsert_external_lead", {
      p_business_id: business_id,
      p_external_source: DAVETMEKANI_SOURCE,
      p_external_id: lead.external_id,
      p_full_name: lead.full_name,
      p_phone: lead.phone,
      p_email: lead.email ?? null,
      p_venue_id: lead.davetpro_venue_id ?? null,
      p_organization_type: organizasyonTuru(lead.event_type_slug),
      p_event_date: lead.event_date ?? null,
      p_guest_count: lead.guest_count ?? null,
      p_notes: lead.message ?? null,
      p_created_at: lead.created_at ?? null,
    });

    if (error) {
      // Tek kaydın hatası tüm partiyi düşürmesin; gönderen taraf yeniden
      // dener ve idempotency sayesinde başarılı olanlar tekrarlanmaz.
      console.error(`[integrations/leads] ${lead.external_id}`, error.message);
      results.push({ external_id: lead.external_id, lead_id: null, created: false });
      continue;
    }

    const sonuc = data as { lead_id: string; created: boolean };
    results.push({
      external_id: lead.external_id,
      lead_id: sonuc.lead_id,
      created: sonuc.created,
    });
  }

  const basarisiz = results.filter((r) => r.lead_id === null).length;
  return NextResponse.json(
    { ok: basarisiz === 0, results },
    { status: basarisiz === 0 ? 200 : 207 },
  );
}
