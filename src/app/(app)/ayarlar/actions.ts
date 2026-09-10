"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin, requireSession } from "@/lib/auth";
import {
  businessSchema,
  contractTemplateSchema,
  type BusinessInput,
  type ContractTemplateInput,
} from "@/lib/schemas";
import { actionError, validationError, type ActionResult } from "@/lib/action-result";
import { env } from "@/lib/env";
import type { UserRole } from "@/lib/database.types";

export async function saveBusiness(input: BusinessInput): Promise<ActionResult> {
  const { business, profile } = await requireSession();
  if (!isAdmin(profile)) {
    return { ok: false, error: "Bu işlem için yönetici olmanız gerekir." };
  }

  const parsed = businessSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);

  const supabase = await createClient();
  const { error } = await supabase
    .from("businesses")
    .update(parsed.data)
    .eq("id", business.id);

  if (error) return actionError(error);

  revalidatePath("/ayarlar");
  revalidatePath("/panel");
  return { ok: true };
}

const inviteSchema = z.object({
  email: z.string().trim().email("Geçerli bir e-posta adresi girin."),
  full_name: z
    .string()
    .trim()
    .min(2, "Ad soyad en az 2 karakter olmalı.")
    .max(120, "Ad soyad çok uzun."),
  role: z.enum(["manager", "staff"]),
  can_view_finance: z.boolean(),
});
export type InviteInput = z.input<typeof inviteSchema>;

/**
 * Personeli davet eder. auth.users'a kayıt açmak servis rolü gerektirdiği için
 * çağıranın yönetici olduğu burada ayrıca doğrulanır.
 */
export async function inviteTeamMember(input: InviteInput): Promise<ActionResult> {
  const { business, profile } = await requireSession();
  if (!isAdmin(profile)) {
    return { ok: false, error: "Bu işlem için yönetici olmanız gerekir." };
  }

  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (error) {
    return actionError(error);
  }

  const { data, error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    // Davet edilen kullanıcının ilk işi şifre belirlemek; giriş ekranına
    // göndermek onu jetonu işlenmemiş hâlde bırakıyordu.
    redirectTo: `${env.appUrl}/sifre-yenile`,
    data: { full_name: parsed.data.full_name, business_name: business.name },
  });

  if (error) {
    return {
      ok: false,
      // "Zaten kayıtlı" çoğunlukla daha önce davet edilmiş ama kurulumu
      // tamamlamamış kişi demek. Kullanıcıya ne yapacağını söylemezsek
      // burada kilitleniyor.
      error: error.message.includes("already been registered")
        ? "Bu e-posta adresi zaten kayıtlı. Listede 'Davet bekliyor' " +
          "görünüyorsa önce daveti iptal edip yeniden gönderin; kişi zaten " +
          "üyeyse giriş ekranındaki 'Şifremi unuttum' ile şifresini " +
          "belirleyebilir."
        : error.message,
    };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: data.user.id,
    business_id: business.id,
    full_name: parsed.data.full_name,
    role: parsed.data.role,
    can_view_finance: parsed.data.can_view_finance,
  });

  if (profileError) {
    // Profil açılamadıysa davet edilen kullanıcı sahipsiz kalmasın.
    await admin.auth.admin.deleteUser(data.user.id);
    return actionError(profileError);
  }

  revalidatePath("/ayarlar");
  return { ok: true };
}

export async function updateTeamMember(
  id: string,
  values: { role: UserRole; can_view_finance: boolean; is_active: boolean },
): Promise<ActionResult> {
  await requireSession();

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      role: values.role,
      can_view_finance: values.can_view_finance,
      is_active: values.is_active,
    })
    .eq("id", id);

  if (error) return actionError(error);

  revalidatePath("/ayarlar");
  return { ok: true };
}

/** Sözleşme şablonunun metnini günceller. Mevcut sözleşmeleri etkilemez —
 *  oluşturulmuş sözleşmeler kendi metinlerini dondurulmuş olarak taşır. */
export async function saveContractTemplate(
  input: ContractTemplateInput,
): Promise<ActionResult> {
  const { business, profile } = await requireSession();
  if (!isAdmin(profile)) {
    return { ok: false, error: "Bu işlem için yönetici olmanız gerekir." };
  }

  const parsed = contractTemplateSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);

  const supabase = await createClient();
  const { error } = await supabase
    .from("contract_templates")
    .update({ body: parsed.data.body })
    .eq("business_id", business.id)
    .eq("is_default", true);

  if (error) return actionError(error);

  revalidatePath("/ayarlar");
  return { ok: true };
}

/**
 * Daveti iptal eder: kullanıcıyı tamamen siler.
 *
 * Yalnızca HİÇ GİRİŞ YAPMAMIŞ kullanıcılar için. Çalışan bir personeli silmek
 * rezervasyon ve tahsilatlardaki "oluşturan" bilgisini koparır; onlar için
 * pasife alma var. Daveti kabul etmemiş kişinin ise bir kaydı yok, silmesi
 * güvenli — ve aynı adrese yeniden davet gönderebilmenin tek yolu bu, çünkü
 * auth kaydı durduğu sürece Supabase "zaten kayıtlı" diyor.
 */
export async function cancelInvite(profileId: string): Promise<ActionResult> {
  const { business, profile } = await requireSession();
  if (!isAdmin(profile)) {
    return { ok: false, error: "Bu işlem için yönetici olmanız gerekir." };
  }
  if (profileId === profile.id) {
    return { ok: false, error: "Kendi hesabınızı silemezsiniz." };
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (error) {
    return actionError(error);
  }

  // Servis rolü tüm işletmeleri görür; kaydın bu işletmeye ait olduğu
  // burada ayrıca doğrulanıyor.
  const { data: hedef } = await admin
    .from("profiles")
    .select("id, business_id")
    .eq("id", profileId)
    .maybeSingle<{ id: string; business_id: string }>();

  if (!hedef || hedef.business_id !== business.id) {
    return { ok: false, error: "Kullanıcı bulunamadı." };
  }

  const { data: authUser, error: authError } =
    await admin.auth.admin.getUserById(profileId);
  if (authError) return actionError(authError);

  if (authUser.user.last_sign_in_at) {
    return {
      ok: false,
      error:
        "Bu kullanıcı sisteme giriş yapmış. Silmek yerine pasife alabilirsiniz; " +
        "böylece geçmiş kayıtlarda kimin ne yaptığı görünmeye devam eder.",
    };
  }

  // profiles.id -> auth.users(id) on delete cascade: profil de gider.
  const { error } = await admin.auth.admin.deleteUser(profileId);
  if (error) return actionError(error);

  revalidatePath("/ayarlar");
  return { ok: true };
}
