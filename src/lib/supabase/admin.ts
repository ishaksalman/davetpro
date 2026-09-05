import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Servis rolü istemcisi — RLS'i tamamen atlar.
 * YALNIZCA sunucu tarafında, çağıranın yetkisi ayrıca doğrulandıktan sonra
 * kullanılır (personel daveti gibi auth.users'a dokunan işlemler).
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY tanımlı değil. Personel daveti için bu anahtar gereklidir.",
    );
  }

  return createClient(env.supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
