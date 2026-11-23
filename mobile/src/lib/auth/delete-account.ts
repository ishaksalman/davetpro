import { toTurkishError } from "@/lib/errors";
import { supabase } from "../supabase";

export type DeleteAccountResult = { ok: true } | { ok: false; error: string };

/**
 * Hesabı kalıcı siler (`delete_my_account` RPC, migration 0048). Yönetici/personelde yalnızca kendi hesabı;
 * işletmenin tek kullanıcısı olan sahipte işletme ve tüm verisi de silinir. İşletmede başka kullanıcı varken
 * sahip silemez (sunucu reddeder, mesaj döner). Başarılı olunca çağıran oturumu kapatır.
 */
export async function deleteMyAccount(): Promise<DeleteAccountResult> {
  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { ok: false, error: toTurkishError(error) };
  return { ok: true };
}
