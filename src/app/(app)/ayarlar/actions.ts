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
      error: error.message.includes("already been registered")
        ? "Bu e-posta adresi zaten kayıtlı."
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
