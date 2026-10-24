import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateMobile, isAdminRole } from "@/lib/mobile-auth";
import { cancelInvite, inviteMember, pendingInviteIds, type AdminLike } from "@/lib/team-invites";

/**
 * Mobil uygulama için personel daveti. Servis rolü anahtarı YALNIZCA burada,
 * çağıranın işletme yöneticisi olduğu doğrulandıktan sonra kullanılır; mobil
 * uygulamada hiçbir zaman bulunmaz.
 *
 *  GET     → davet bekleyen üyelerin kimlikleri
 *  POST    → davet gönder  { email, full_name, role, can_view_finance }
 *  DELETE  → daveti iptal et { profileId }
 */

async function guard(request: Request) {
  const auth = await authenticateMobile(request);
  if (!auth.ok) return { response: auth.response } as const;
  if (!isAdminRole(auth.caller.profile)) {
    return {
      response: NextResponse.json({ ok: false, error: "Bu işlem için yönetici olmanız gerekir." }, { status: 403 }),
    } as const;
  }
  try {
    return { caller: auth.caller, admin: createAdminClient() as unknown as AdminLike } as const;
  } catch (e) {
    console.error("[mobile/team] admin istemcisi:", e instanceof Error ? e.message : e);
    return {
      response: NextResponse.json({ ok: false, error: "Sunucuda davet yapılandırılmamış." }, { status: 500 }),
    } as const;
  }
}

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });

export async function GET(request: Request) {
  const g = await guard(request);
  if ("response" in g) return g.response;

  // Üye listesi çağıranın kendi jetonuyla (RLS) okunur: yalnızca kendi işletmesinin üyeleri.
  const { data } = await g.caller.db.from("profiles").select("id").eq("business_id", g.caller.business.id);
  const ids = (data ?? []).map((r: { id: string }) => r.id);
  return json({ ok: true, pending: await pendingInviteIds(g.admin, ids) });
}

export async function POST(request: Request) {
  const g = await guard(request);
  if ("response" in g) return g.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Gövde JSON değil." }, 400);
  }

  const r = await inviteMember({
    admin: g.admin,
    businessId: g.caller.business.id,
    businessName: g.caller.business.name,
    appUrl: env.appUrl,
    input: body,
  });
  return json(r, r.ok ? 200 : 400);
}

const cancelSchema = z.object({ profileId: z.string().uuid("Geçersiz kullanıcı.") });

export async function DELETE(request: Request) {
  const g = await guard(request);
  if ("response" in g) return g.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Gövde JSON değil." }, 400);
  }
  const parsed = cancelSchema.safeParse(body);
  if (!parsed.success) return json({ ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz veri." }, 400);

  const r = await cancelInvite({
    admin: g.admin,
    businessId: g.caller.business.id,
    callerId: g.caller.userId,
    profileId: parsed.data.profileId,
  });
  return json(r, r.ok ? 200 : 400);
}
