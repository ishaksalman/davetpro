"use server";

import { revalidatePath } from "next/cache";
import { requireSessionAllowExpired } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { extendAccessSchema, type ExtendAccessInput } from "@/lib/schemas";
import { actionError, validationError, type ActionResult } from "@/lib/action-result";

/**
 * Bir işletmenin erişim süresini uzatır.
 *
 * requireSessionAllowExpired: platform yöneticisi zaten kilitten muaf, ama bu
 * eylem kilidin dışında çalışması gereken bir yönetim işlemi — kendi süresi
 * bir şekilde dolsa bile başkasının süresini uzatabilmeli.
 *
 * Yetki denetimi burada DEĞİL veritabanında: admin_extend_access() çağıranın
 * platform yöneticisi olmadığını görürse hata veriyor. Buradaki kontrol
 * kullanıcıya anlaşılır mesaj vermek için, güvenlik sınırı o değil.
 */
export async function extendAccess(input: ExtendAccessInput): Promise<ActionResult> {
  const { isPlatformAdmin } = await requireSessionAllowExpired();
  if (!isPlatformAdmin) {
    return { ok: false, error: "Bu işlem için platform yöneticisi olmanız gerekir." };
  }

  const parsed = extendAccessSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_extend_access", {
    p_business_id: parsed.data.business_id,
    p_days: parsed.data.days,
    p_note: parsed.data.note,
  });
  if (error) return actionError(error);

  revalidatePath("/yonetim");
  return { ok: true };
}
