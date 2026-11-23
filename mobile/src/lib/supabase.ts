import "react-native-url-polyfill/auto";
import { AppState } from "react-native";
import { createClient } from "@supabase/supabase-js";
import { env } from "./env";
import { secureStorage } from "./secure-storage";

/**
 * Tek Supabase istemcisi. Kullanıcının JWT'siyle çalışır: tenant izolasyonu ve
 * finans yetkisi RLS'te (business_id filtresi güvenlik mekanizması DEĞİL).
 */
export const supabase = createClient(env.supabaseUrl || "http://invalid.local", env.supabaseAnonKey || "invalid", {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Mobilde URL'den oturum çıkarma elle yapılır (bkz. auth-links.ts).
    detectSessionInUrl: false,
  },
});

// Uygulama arka plandayken token yenileme durur, öne gelince sürer.
AppState.addEventListener("change", (state) => {
  if (state === "active") supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
