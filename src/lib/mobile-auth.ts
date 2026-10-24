import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Business, Profile } from "@/lib/database.types";

/** `db`: çağıranın kendi jetonuyla (RLS açık) çalışan istemci. */
export type MobileCaller = { userId: string; profile: Profile; business: Business; db: SupabaseClient };

/**
 * Mobil uygulama isteğinin kimliği: `Authorization: Bearer <Supabase erişim jetonu>`.
 *
 * Jeton Supabase Auth'a doğrulatılır (getUser — imza + iptal kontrolü) ve profil/
 * işletme KULLANICININ KENDİ jetonuyla (RLS açık) okunur; servis rolü burada
 * kullanılmaz. Süresi dolmuş hesap web `requireSession` ile aynı şekilde reddedilir.
 */
export async function authenticateMobile(
  request: Request,
): Promise<{ ok: true; caller: MobileCaller } | { ok: false; response: NextResponse }> {
  const deny = (error: string, status: number) => ({
    ok: false as const,
    response: NextResponse.json({ ok: false, error }, { status }),
  });

  const header = request.headers.get("authorization") ?? "";
  const token = /^Bearer\s+(.+)$/i.exec(header)?.[1]?.trim();
  if (!token) return deny("Oturum gerekli.", 401);

  const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return deny("Oturum geçersiz veya süresi dolmuş.", 401);

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, business:businesses(*)")
    .eq("id", userData.user.id)
    .maybeSingle<Profile & { business: Business }>();
  if (!profile?.business) return deny("İşletme bulunamadı.", 403);
  if (!profile.is_active) return deny("Hesabınız pasif.", 403);

  const [{ data: sub }, { data: platform }] = await Promise.all([
    supabase.from("subscriptions").select("access_until").maybeSingle<{ access_until: string }>(),
    supabase.rpc("is_platform_admin"),
  ]);
  if (sub && new Date(sub.access_until).getTime() <= Date.now() && platform !== true) {
    return deny("Erişim süreniz dolmuş.", 403);
  }

  const { business, ...rest } = profile;
  return { ok: true, caller: { userId: userData.user.id, profile: rest, business, db: supabase } };
}

export function isAdminRole(profile: Pick<Profile, "role">): boolean {
  return profile.role === "owner" || profile.role === "manager";
}
