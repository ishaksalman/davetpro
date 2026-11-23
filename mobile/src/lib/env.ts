/**
 * Ortam değişkenleri (EXPO_PUBLIC_*). Eksikse sessizce yanlış davranmak yerine
 * açık hata verir. Yalnızca anon anahtar kullanılır; service_role anahtarı
 * mobil uygulamaya KONMAZ (davet gibi işlemler sunucuda kalır).
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const envError: string | null =
  !url || !anon
    ? "EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY tanımlı değil. mobile/.env dosyasını .env.example'a göre doldurun."
    : null;

export const env = {
  supabaseUrl: url ?? "",
  supabaseAnonKey: anon ?? "",
  appUrl: (process.env.EXPO_PUBLIC_APP_URL ?? "").replace(/\/$/, ""),
  /** Yasal sayfalar: mağaza formları ve kayıt ekranı bunları ister. Ortam değişkeniyle ezilebilir. */
  privacyUrl: process.env.EXPO_PUBLIC_PRIVACY_URL || `${(process.env.EXPO_PUBLIC_APP_URL ?? "").replace(/\/$/, "")}/gizlilik`,
  termsUrl: process.env.EXPO_PUBLIC_TERMS_URL || `${(process.env.EXPO_PUBLIC_APP_URL ?? "").replace(/\/$/, "")}/kullanim-kosullari`,
};
