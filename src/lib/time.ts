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

const hourMinute = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/**
 * Etkinlik bitti mi? (işletme saatine göre)
 *
 * Geçmiş bir günse evet; bugünse bitiş saati geçtiyse evet. Bitişi
 * başlangıçtan önce görünen kayıtlar (gece yarısını aşan işler) bugün
 * içinde "bitmedi" sayılıyor: ertesi güne taşan bir işi akşam
 * "çekim yapıldı" göstermek yanlış olurdu.
 */
export function isShootOver(
  eventDate: string,
  endTime: string,
  startTime?: string,
  now: Date = new Date(),
): boolean {
  const bugun = todayISO(now);
  if (eventDate < bugun) return true;
  if (eventDate > bugun) return false;
  const bitis = endTime.slice(0, 5);
  if (startTime && bitis <= startTime.slice(0, 5)) return false;
  return bitis <= hourMinute.format(now);
}
