import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { dogrula } from "@/lib/integrations/signature";

/**
 * DavetMekanı'nın girdiği bağlama kodunu doğrular ve işletme/salon
 * eşleşmesini döner. Kod tek kullanımlıktır.
 */

const bodySchema = z.object({
  v: z.literal(1),
  code: z.string().trim().min(4).max(16),
});

export async function POST(request: Request) {
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
    return NextResponse.json({ ok: false, error: "Geçersiz gövde." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("consume_integration_link_code", {
    p_code: parsed.data.code,
  });

  if (error) {
    console.error("[integrations/verify-link]", error.message);
    return NextResponse.json({ ok: false, error: "Sunucu hatası." }, { status: 500 });
  }

  const sonuc = data as
    | { ok: true; business_id: string; business_name: string; venue_id: string | null; venue_name: string | null }
    | { ok: false; reason: "not_found" | "already_used" | "expired" };

  if (!sonuc.ok) {
    // Üçünü de 410 ile dönüyoruz: "kod yok" ile "kod kullanılmış" ayrımı
    // deneme yanılmayla geçerli kod aramayı kolaylaştırır.
    return NextResponse.json({ ok: false, error: "Kod geçersiz veya süresi dolmuş." },
      { status: 410 });
  }

  return NextResponse.json(sonuc);
}
