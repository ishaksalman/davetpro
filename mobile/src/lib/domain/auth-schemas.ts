import { z } from "zod";
import { BUSINESS_TYPES } from "@/lib/vertical";
import type { BusinessType } from "@/lib/database.types";

/** Web `(auth)/actions.ts` içindeki şemalarla aynı kurallar ve mesajlar. */
export const loginSchema = z.object({
  email: z.string().trim().email("Geçerli bir e-posta adresi girin."),
  password: z.string().min(1, "Şifrenizi girin."),
});
export type LoginInput = z.input<typeof loginSchema>;

export const emailSchema = z.object({
  email: z.string().trim().email("Geçerli bir e-posta adresi girin."),
});
export type EmailInput = z.input<typeof emailSchema>;

export const newPasswordSchema = z
  .object({
    password: z.string().min(8, "Şifre en az 8 karakter olmalı."),
    passwordAgain: z.string(),
  })
  .refine((v) => v.password === v.passwordAgain, { message: "Şifreler eşleşmiyor.", path: ["passwordAgain"] });
export type NewPasswordInput = z.input<typeof newPasswordSchema>;

/** Web `setupBusinessAction` ile aynı kurallar ve mesajlar (işletme kurulumu). */
export const setupBusinessSchema = z.object({
  businessName: z.string().trim().min(2, "İşletme adı en az 2 karakter olmalı.").max(120, "İşletme adı çok uzun."),
  fullName: z.string().trim().min(2, "Ad soyad en az 2 karakter olmalı.").max(120, "Ad soyad çok uzun."),
  /** Geçersiz ya da eksik gelirse salon kabul edilir (web ile aynı); liste BUSINESS_TYPES'tan türetilir. */
  businessType: z.enum(BUSINESS_TYPES as [BusinessType, ...BusinessType[]]).catch("salon"),
});
export type SetupBusinessInput = z.input<typeof setupBusinessSchema>;
