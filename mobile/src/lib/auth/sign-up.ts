import * as Linking from "expo-linking";
import { toTurkishError } from "@/lib/errors";
import { env } from "../env";
import { supabase } from "../supabase";

export type SignUpResult =
  | { ok: true; needsEmailConfirmation: boolean }
  | { ok: false; error: string };

/**
 * Web `registerAction` ile aynı `signUp` çağrısı. İşletme BURADA açılmaz: işin cinsi
 * kurulum adımında sorulur (web ile aynı sebep). Pazarlama izni onboarding'de sorulmadığı
 * için açıkça `false` gider.
 */
export async function signUpWithEmail(email: string, password: string): Promise<SignUpResult> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { marketing_consent: false },
      emailRedirectTo: Linking.createURL("auth/callback") || `${env.appUrl}/auth/callback`,
    },
  });
  if (error) return { ok: false, error: toTurkishError(error) };
  return { ok: true, needsEmailConfirmation: !data.session };
}
