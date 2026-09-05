"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { toTurkishError } from "@/lib/errors";

export type AuthState = { error?: string; notice?: string };

const loginSchema = z.object({
  email: z.string().trim().email("Geçerli bir e-posta adresi girin."),
  password: z.string().min(1, "Şifrenizi girin."),
});

const registerSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(2, "İşletme adı en az 2 karakter olmalı.")
    .max(120, "İşletme adı çok uzun."),
  fullName: z
    .string()
    .trim()
    .min(2, "Ad soyad en az 2 karakter olmalı.")
    .max(120, "Ad soyad çok uzun."),
  email: z.string().trim().email("Geçerli bir e-posta adresi girin."),
  password: z.string().min(8, "Şifre en az 8 karakter olmalı."),
});

export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: toTurkishError(error) };

  const next = String(formData.get("devam") ?? "") || "/panel";
  redirect(next.startsWith("/") ? next : "/panel");
}

export async function registerAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = registerSchema.safeParse({
    businessName: formData.get("businessName"),
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { businessName, fullName, email, password } = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // E-posta doğrulaması açıksa oturum hemen açılmaz; bu bilgiler
    // /isletme-kur adımında formu önden doldurmak için saklanır.
    options: { data: { full_name: fullName, business_name: businessName } },
  });
  if (error) return { error: toTurkishError(error) };

  if (!data.session) {
    return {
      notice:
        "Hesabınız oluşturuldu. Devam etmek için e-postanıza gönderdiğimiz doğrulama bağlantısına tıklayın.",
    };
  }

  const { error: rpcError } = await supabase.rpc("create_business_with_owner", {
    p_business_name: businessName,
    p_full_name: fullName,
  });
  if (rpcError) return { error: toTurkishError(rpcError) };

  redirect("/panel");
}

export async function setupBusinessAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = registerSchema
    .pick({ businessName: true, fullName: true })
    .safeParse({
      businessName: formData.get("businessName"),
      fullName: formData.get("fullName"),
    });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_business_with_owner", {
    p_business_name: parsed.data.businessName,
    p_full_name: parsed.data.fullName,
  });
  if (error) return { error: toTurkishError(error) };

  redirect("/panel");
}

const emailSchema = z.object({
  email: z.string().trim().email("Geçerli bir e-posta adresi girin."),
});

const passwordSchema = z.object({
  password: z.string().min(8, "Şifre en az 8 karakter olmalı."),
  passwordAgain: z.string(),
}).refine((v) => v.password === v.passwordAgain, {
  message: "Şifreler eşleşmiyor.",
  path: ["passwordAgain"],
});

/** Şifre sıfırlama bağlantısı gönderir. */
export async function requestPasswordResetAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = emailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env.appUrl}/auth/callback?next=/sifre-yenile`,
  });

  // Hata olsa da aynı mesaj: hangi e-postanın kayıtlı olduğu sızdırılmamalı.
  return {
    notice:
      "Bu adres kayıtlıysa şifre sıfırlama bağlantısı gönderildi. E-postanızı kontrol edin.",
  };
}

/** Sıfırlama bağlantısıyla açılan oturumda yeni şifreyi belirler. */
export async function updatePasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = passwordSchema.safeParse({
    password: formData.get("password"),
    passwordAgain: formData.get("passwordAgain"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: toTurkishError(error) };

  redirect("/panel");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/giris");
}
