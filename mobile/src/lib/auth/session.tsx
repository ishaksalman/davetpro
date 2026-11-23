import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { toTurkishError } from "@/lib/errors";
import { subscriptionInfo, type SubscriptionInfo } from "@/lib/subscription";
import { vertical, type Vertical } from "@/lib/vertical";
import type { Business, Profile, Subscription } from "@/lib/database.types";
import { envError } from "../env";
import { canSeeFinance, isAdmin } from "../permissions";
import { supabase } from "../supabase";

export type AppSession = {
  user: { id: string; email: string | null };
  profile: Profile;
  business: Business;
  /** Satır okunamazsa null — kilit uygulanmaz (web getSession ile aynı gerekçe). */
  subscription: SubscriptionInfo | null;
  isPlatformAdmin: boolean;
};

type State =
  | { status: "loading" }
  | { status: "signedOut" }
  /** Oturum var ama profil yok: işletme kurulumu web'de yapılır. */
  | { status: "noProfile"; email: string | null }
  | { status: "error"; message: string }
  | { status: "ready"; session: AppSession };

type Ctx = {
  state: State;
  /** Şifre sıfırlama / davet bağlantısıyla gelindi: yeni şifre belirlenmeli. */
  passwordSetupPending: boolean;
  setPasswordSetupPending: (v: boolean) => void;
  vertical: Vertical;
  canFinance: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  signOut: () => Promise<void>;
  reload: () => Promise<void>;
};

export type SessionContextValue = Ctx;
export const SessionContext = createContext<Ctx | null>(null);

async function loadAppSession(auth: Session): Promise<State> {
  const userId = auth.user.id;
  // Abonelik ve platform yetkisi profile bağlı değil — RLS ikisini de kendi
  // başına kısıtlıyor; üç sorgu paralel (web getSession ile aynı).
  const [profil, abonelik, platform] = await Promise.all([
    supabase.from("profiles").select("*, business:businesses(*)").eq("id", userId).maybeSingle<Profile & { business: Business }>(),
    supabase.from("subscriptions").select("*").maybeSingle<Subscription>(),
    supabase.rpc("is_platform_admin"),
  ]);

  // Profil sorgusu HATA verdiyse "profil yok" deme: ağ hatası kullanıcıyı sebepsiz kuruluma atardı.
  if (profil.error) return { status: "error", message: toTurkishError(profil.error) };
  if (!profil.data?.business) return { status: "noProfile", email: auth.user.email ?? null };

  const { business, ...profile } = profil.data;
  return {
    status: "ready",
    session: {
      user: { id: userId, email: auth.user.email ?? null },
      profile,
      business,
      subscription: abonelik.error || !abonelik.data ? null : subscriptionInfo(abonelik.data),
      isPlatformAdmin: platform.data === true,
    },
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<State>({ status: "loading" });
  const [passwordSetupPending, setPasswordSetupPending] = useState(false);
  const lastUser = useRef<string | null>(null);

  const apply = useCallback(
    async (auth: Session | null) => {
      const uid = auth?.user.id ?? null;
      // Çıkışta ve kullanıcı değişiminde kullanıcıya ait önbellek temizlenir:
      // başka işletmenin verisi hiçbir ekranda bir an bile görünmesin.
      if (uid !== lastUser.current) {
        queryClient.clear();
        lastUser.current = uid;
      }
      if (!auth) return setState({ status: "signedOut" });
      try {
        setState(await loadAppSession(auth));
      } catch (e) {
        setState({ status: "error", message: toTurkishError(e) });
      }
    },
    [queryClient],
  );

  useEffect(() => {
    if (envError) {
      setState({ status: "error", message: envError });
      return;
    }
    supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, auth) => {
      if (event === "PASSWORD_RECOVERY") setPasswordSetupPending(true);
      // TOKEN_REFRESHED aynı kullanıcı: profili yeniden yüklemeye gerek yok.
      if (event === "TOKEN_REFRESHED") return;
      // Supabase kuralı: bu geri çağrıda başka auth çağrısı beklenmez → ertele.
      setTimeout(() => apply(auth), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [apply]);

  const reload = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await apply(data.session);
  }, [apply]);

  const signIn = useCallback<Ctx["signIn"]>(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { ok: false, error: toTurkishError(error) };
    return { ok: true };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    setPasswordSetupPending(false);
  }, [queryClient]);

  const value = useMemo<Ctx>(() => {
    const ready = state.status === "ready" ? state.session : null;
    return {
      state,
      passwordSetupPending,
      setPasswordSetupPending,
      vertical: vertical(ready?.business.business_type),
      canFinance: ready ? canSeeFinance(ready.profile) : false,
      isAdmin: ready ? isAdmin(ready.profile) : false,
      signIn,
      signOut,
      reload,
    };
  }, [state, passwordSetupPending, signIn, signOut, reload]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSessionContext(): Ctx {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("SessionProvider eksik.");
  return ctx;
}

/** Yalnızca oturum hazır ekranlarda: AppSession garanti. */
export function useAppSession(): AppSession {
  const { state } = useSessionContext();
  if (state.status !== "ready") throw new Error("Oturum hazır değil.");
  return state.session;
}
