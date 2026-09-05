/**
 * Ortam değişkenleri tek yerden okunur; eksikse uygulama sessizce
 * yanlış davranmak yerine açık bir hata verir.
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `${name} tanımlı değil. .env.local dosyanızı .env.example'a göre doldurun.`,
    );
  }
  return value;
}

export const env = {
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  },
  get supabaseAnonKey() {
    return required(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
  },
  /**
   * Uygulamanın herkese açık adresi. Davet ve şifre sıfırlama e-postalarındaki
   * bağlantılar buradan üretiliyor; canlıda yanlış olursa kullanıcı kırık bir
   * linke tıklar. Bu yüzden üretimde sessizce localhost'a düşmüyor.
   */
  get appUrl() {
    const explicit = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
    if (explicit) return explicit;

    // Vercel önizleme dağıtımlarında adres her seferinde değiştiği için
    // platformun verdiği alan adı yedek olarak kullanılıyor.
    const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
    if (vercel) return `https://${vercel}`;

    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "NEXT_PUBLIC_APP_URL tanımlı değil. Davet ve şifre sıfırlama bağlantıları " +
          "bu adresten üretildiği için canlı ortamda zorunludur.",
      );
    }
    return "http://localhost:3000";
  },
};
