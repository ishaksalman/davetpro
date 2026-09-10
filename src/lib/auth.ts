import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { subscriptionInfo, type SubscriptionInfo } from "@/lib/subscription";
import type { Business, Profile, Subscription } from "@/lib/database.types";

/** Oturum sahibinin kimliği. Tam Supabase User nesnesine ihtiyacımız yok. */
export type AuthUser = { id: string; email: string | null };

export type AppSession = {
  user: AuthUser;
  profile: Profile;
  business: Business;
  /** Erişim hakkı. Satır okunamazsa null — kilit uygulanmaz, bkz. getSession. */
  subscription: SubscriptionInfo | null;
  /** Uygulamayı işleten taraf: kilitten muaf, yönetim ekranını görür. */
  isPlatformAdmin: boolean;
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

  // Abonelik ve platform yetkisi profile bağlı değil — RLS ikisini de kendi
  // başına kısıtlıyor, bu yüzden üç sorgu paralel gidiyor.
  const [profil, abonelik, platform] = await Promise.all([
    supabase
      .from("profiles")
      .select("*, business:businesses(*)")
      .eq("id", user.id)
      .maybeSingle<Profile & { business: Business }>(),
    supabase.from("subscriptions").select("*").maybeSingle<Subscription>(),
    supabase.rpc("is_platform_admin"),
  ]);

  // Sessizce null dönmek kullanıcıyı sebepsiz kuruluma atar; sebebi loglayalım.
  if (profil.error) console.error("[auth] Profil okunamadı:", profil.error.message);
  if (!profil.data?.business) return null;

  /*
   * Abonelik okunamazsa kilidi UYGULAMIYORUZ.
   *
   * Satır her işletme için tetikleyiciyle açılıyor; yoksa ya sorgu hata verdi
   * ya tetikleyici çalışmadı — ikisi de bizim tarafımızdaki bir arıza. Böyle
   * bir durumda ödemesi güncel bir salonu düğün günü dışarıda bırakmak,
   * birkaç günlük bedava kullanımdan çok daha pahalı.
   */
  if (abonelik.error) {
    console.error("[auth] Abonelik okunamadı:", abonelik.error.message);
  } else if (!abonelik.data) {
    console.error("[auth] Abonelik satırı yok:", profil.data.business_id);
  }

  const { business, ...profile } = profil.data;
  return {
    user,
    profile,
    business,
    subscription: abonelik.data ? subscriptionInfo(abonelik.data) : null,
    isPlatformAdmin: platform.data === true,
  };
});

/**
 * Oturum + profil + işletme; süresi dolmuş hesapta kilit UYGULANMADAN.
 * Yalnızca /abonelik gibi kilidin dışında kalması gereken sayfalar için.
 */
export async function requireSessionAllowExpired(): Promise<AppSession> {
  const session = await getSession();
  if (session) return session;

  // Önbellekten gelir, ek istek yapmaz.
  const user = await getAuthUser();
  redirect(user ? "/isletme-kur" : "/giris");
}

/**
 * Korumalı sayfalar için: oturum yoksa girişe, profil yoksa kuruluma,
 * süresi dolmuşsa abonelik sayfasına yönlendirir.
 *
 * Kilit burada duruyor çünkü hem sayfalar hem sunucu eylemleri buradan
 * geçiyor — tek kapı. Ama bu bir ARAYÜZ kilidi: kullanıcının elindeki token
 * RLS tarafında hâlâ geçerli, doğrudan PostgREST'e istek atan biri yazmaya
 * devam edebilir. Bunu gerçekten kapatmak için subscription kontrolünün yazma
 * politikalarına girmesi gerekir.
 */
export async function requireSession(): Promise<AppSession> {
  const session = await requireSessionAllowExpired();

  if (
    session.subscription?.state === "sona_erdi" &&
    !session.isPlatformAdmin
  ) {
    redirect("/abonelik");
  }

  return session;
}

/** Finansal verileri görebilir mi? RLS ile aynı kuralın istemci tarafı karşılığı. */
export function canSeeFinance(profile: Profile): boolean {
  return profile.role !== "staff" || profile.can_view_finance;
}

export function isAdmin(profile: Profile): boolean {
  return profile.role === "owner" || profile.role === "manager";
}
