import type { EmailOtpType } from "@supabase/supabase-js";
import { toTurkishError } from "@/lib/errors";
import { supabase } from "../supabase";

const OTP_TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

export type AuthLinkResult =
  | { handled: false }
  | { handled: true; ok: true; type: string | null; needsPassword: boolean }
  | { handled: true; ok: false; error: string };

/**
 * E-posta bağlantılarını (davet, şifre sıfırlama, doğrulama) uygulamada işler.
 * Web `auth/callback` ile AYNI üç biçim desteklenir; mevcut bağlantılar bozulmaz:
 *  - `token_hash` + `type` → verifyOtp (durumsuz, tercih edilen)
 *  - `code` → exchangeCodeForSession (yalnızca uygulamadan başlatılan PKCE akışı)
 *  - `#access_token&refresh_token` → setSession (örtük akış)
 * Biçimi tanımayan URL'ler yok sayılır.
 */
export async function handleAuthUrl(url: string): Promise<AuthLinkResult> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { handled: false };
  }

  const q = parsed.searchParams;
  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ""));
  const type = q.get("type") ?? hash.get("type");
  const tokenHash = q.get("token_hash");
  const code = q.get("code");
  const access = hash.get("access_token");
  const refresh = hash.get("refresh_token");

  const needsPassword = type === "recovery" || type === "invite";

  if (hash.get("error_description")) {
    return { handled: true, ok: false, error: "Bağlantı geçersiz ya da süresi dolmuş." };
  }

  if (tokenHash && type && OTP_TYPES.includes(type as EmailOtpType)) {
    const { error } = await supabase.auth.verifyOtp({ type: type as EmailOtpType, token_hash: tokenHash });
    return error
      ? { handled: true, ok: false, error: toTurkishError(error) }
      : { handled: true, ok: true, type, needsPassword };
  }
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return error
      ? { handled: true, ok: false, error: toTurkishError(error) }
      : { handled: true, ok: true, type, needsPassword };
  }
  if (access && refresh) {
    const { error } = await supabase.auth.setSession({ access_token: access, refresh_token: refresh });
    return error
      ? { handled: true, ok: false, error: toTurkishError(error) }
      : { handled: true, ok: true, type, needsPassword };
  }
  return { handled: false };
}
