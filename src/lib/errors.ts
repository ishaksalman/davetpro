/**
 * Veritabanı şeması eskiyse dönen mesaj. Sabit olarak dışa açılıyor çünkü
 * arayüzün bu durumu diğer hatalardan ayırt etmesi gerekiyor: şema eksikken
 * sunucu tarafı denetimler de yok, "sunucu yine de engeller" demek yanlış olur.
 */
export const SCHEMA_OUTDATED_MESSAGE =
  "Veritabanı şeması güncel değil. supabase/migrations altındaki dosyaları " +
  "Supabase SQL Editor'de sırayla çalıştırın.";

/** Supabase/Postgres hatalarını kullanıcının anlayacağı Türkçeye çevirir. */
export function toTurkishError(error: unknown): string {
  if (!error) return "Bilinmeyen bir hata oluştu.";

  const err = error as { message?: string; code?: string; details?: string };
  const message = err.message ?? String(error);

  // Veritabanı kısıtları
  if (message.includes("reservations_no_overlap")) {
    return "Bu salonda seçtiğiniz tarih ve saat aralığında başka bir rezervasyon var.";
  }
  if (err.code === "23505" || message.includes("duplicate key")) {
    if (message.includes("venues_business_id_name_key")) return "Bu isimde bir salon zaten var.";
    if (message.includes("packages_business_id_name_key")) return "Bu isimde bir paket zaten var.";
    if (message.includes("expense_categories_business_id_name_key"))
      return "Bu isimde bir gider kategorisi zaten var.";
    return "Bu kayıt zaten mevcut.";
  }
  if (err.code === "23503" || message.includes("violates foreign key")) {
    // En sık karşılaşılan iki durum için ne yapılacağını da söyle.
    if (message.includes("leads_reservation_id") || message.includes("venue_holds_reservation_id")) {
      return (
        "Bu rezervasyon bir talepten oluşturulduğu için silinemez. " +
        "Gerçekleşmeyecekse durumunu 'İptal edildi' yapın."
      );
    }
    if (message.includes("contracts_reservation_id")) {
      return (
        "Bu rezervasyonun sözleşmesi olduğu için silinemez. " +
        "Önce sözleşmeyi iptal edin veya rezervasyonu 'İptal edildi' yapın."
      );
    }
    return "Bu kayda bağlı başka kayıtlar olduğu için işlem yapılamıyor.";
  }
  if (err.code === "42501" || message.includes("permission denied")) {
    return "Bu işlem için yetkiniz yok.";
  }
  // PostgREST, veritabanında olmayan bir fonksiyon çağrıldığında bunu döner.
  // Pratikte tek anlamı var: migration'lar bu projede çalıştırılmamış.
  if (
    message.includes("Could not find the function") ||
    message.includes("schema cache")
  ) {
    return SCHEMA_OUTDATED_MESSAGE;
  }

  // Trigger'lardan gelen mesajlar zaten Türkçe
  if (/[çğıöşüÇĞİÖŞÜ]/.test(message) || message.includes("₺")) return message;

  // Supabase Auth
  const authMessages: Record<string, string> = {
    "Invalid login credentials": "E-posta veya şifre hatalı.",
    "Email not confirmed": "E-posta adresinizi henüz doğrulamadınız.",
    "User already registered": "Bu e-posta adresiyle bir hesap zaten var.",
    "Password should be at least 6 characters":
      "Şifre en az 6 karakter olmalıdır.",
    "Unable to validate email address: invalid format":
      "Geçersiz e-posta adresi.",
    "For security purposes, you can only request this after 60 seconds.":
      "Güvenlik nedeniyle 60 saniye sonra tekrar deneyebilirsiniz.",
  };
  for (const [en, tr] of Object.entries(authMessages)) {
    if (message.includes(en)) return tr;
  }

  return message;
}
