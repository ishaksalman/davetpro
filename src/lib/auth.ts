import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Business, Profile } from "@/lib/database.types";

/** Oturum sahibinin kimliği. Tam Supabase User nesnesine ihtiyacımız yok. */
export type AuthUser = { id: string; email: string | null };

export type AppSession = {
  user: AuthUser;
  profile: Profile;
  business: Business;
};

/**
 * Oturumdaki kullanıcı.
 *
 * getClaims(), JWT imzasını proje anahtarıyla YEREL olarak doğrular; proje
 * asimetrik anahtar (ES256) kullandığı sürece Supabase'e ağ isteği gitmez.
 * getUser() ise her çağrıda Auth sunucusuna gider (~400 ms). Sayfa başına
 * birkaç kez çağrıldığı için bu fark doğrudan gezinme hızına yansır.
 *
 * Simetrik (eski) anahtarlı projelerde getClaims da sunucuya sorar; davranış
 * aynı kalır, yalnızca hız avantajı olmaz.
 *
 * React cache: aynı istek içinde kaç kez çağrılırsa çağrılsın tek kez çalışır.
 */
export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;

  return {
    id: data.claims.sub,
    email: typeof data.claims.email === "string" ? data.claims.email : null,
  };
});

/** Oturum + profil + işletme. İstek başına tek sorgu (React cache). */
export const getSession = cache(async (): Promise<AppSession | null> => {
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*, business:businesses(*)")
    .eq("id", user.id)
    .maybeSingle<Profile & { business: Business }>();

  // Sessizce null dönmek kullanıcıyı sebepsiz kuruluma atar; sebebi loglayalım.
  if (error) console.error("[auth] Profil okunamadı:", error.message);
  if (!data?.business) return null;

  const { business, ...profile } = data;
  return { user, profile, business };
});

/** Korumalı sayfalar için: oturum yoksa girişe, profil yoksa kuruluma yönlendirir. */
export async function requireSession(): Promise<AppSession> {
  const session = await getSession();
  if (session) return session;

  // Önbellekten gelir, ek istek yapmaz.
  const user = await getAuthUser();
  redirect(user ? "/isletme-kur" : "/giris");
}

/** Finansal verileri görebilir mi? RLS ile aynı kuralın istemci tarafı karşılığı. */
export function canSeeFinance(profile: Profile): boolean {
  return profile.role !== "staff" || profile.can_view_finance;
}

export function isAdmin(profile: Profile): boolean {
  return profile.role === "owner" || profile.role === "manager";
}
