import { toTurkishError } from "@/lib/errors";
import { setupBusinessSchema, type SetupBusinessInput } from "../domain/auth-schemas";
import { supabase } from "../supabase";

export type CreateBusinessResult = { ok: true } | { ok: false; error: string };

/**
 * İşletme kurulumu: web `setupBusinessAction` ile aynı `create_business_with_owner` RPC'si.
 * İşletme, sahip profili, gider kategorileri ve sözleşme şablonu sunucuda tek işlemde açılır;
 * işin cinsi sonradan DEĞİŞTİRİLEMEZ. Başarılı olunca çağıran oturumu yeniden yükler.
 */
export async function createBusiness(input: SetupBusinessInput): Promise<CreateBusinessResult> {
  const parsed = setupBusinessSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { error } = await supabase.rpc("create_business_with_owner", {
    p_business_name: parsed.data.businessName,
    p_full_name: parsed.data.fullName,
    p_business_type: parsed.data.businessType,
  });
  if (error) return { ok: false, error: toTurkishError(error) };
  return { ok: true };
}
