import { parseISO } from "date-fns";

/**
 * İşletmenin saat dilimi.
 *
 * Sunucu (Vercel'de UTC) ile kullanıcının saati farklı olduğu için tarihleri
 * sunucunun yereline bırakmak yanlış sonuç veriyordu: Türkiye'de 1 Eylül
 * 00:30'da sunucu hâlâ "31 Ağustos" diyor, "bu ay" raporu Ağustos'a düşüyordu.
 * Gün ve ay sınırlarını hep bu saat dilimine göre hesaplıyoruz.
 */
export const APP_TIME_ZONE = process.env.NEXT_PUBLIC_APP_TIME_ZONE ?? "Europe/Istanbul";

// en-CA yyyy-MM-dd üretir — ISO tarih için en kısa yol.
const isoDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** İşletme saatine göre bugün (yyyy-MM-dd). */
export function todayISO(now: Date = new Date()): string {
  return isoDate.format(now);
}

/**
 * İşletme saatine göre bugün, Date olarak (yerel gece yarısı).
 * date-fns ile ay/hafta sınırı hesaplamak için kullanılır.
 */
export function today(now: Date = new Date()): Date {
  return parseISO(todayISO(now));
}
