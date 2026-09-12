import { differenceInCalendarDays } from "date-fns";
import { whatsAppLink } from "@/lib/format";
import { today } from "@/lib/time";
import type { Subscription } from "@/lib/database.types";

/**
 * Yeni hesapların deneme süresi (gün).
 * Veritabanındaki public.trial_days() ile aynı olmalı; süreyi orada
 * değiştirirsen buradaki metinler de yanlış olur.
 */
export const TRIAL_DAYS = 30;

/** Süre bitimine bu kadar gün kalınca uyarı şeridi çıkar. */
export const SUBSCRIPTION_WARNING_DAYS = 7;

/** Süre uzatma taleplerinin geldiği numara. */
export const BILLING_WHATSAPP = "0538 927 57 28";

export type SubscriptionState = "deneme" | "abone" | "sona_erdi";

/**
 * Fiyatlandırma: TEK PAKET, TEK DÖNEM — yıllık.
 *
 * NEDEN KADEME YOK: kademe, her yeni özellikte "bu hangi pakette" sorusunu,
 * yükseltme yolunu, limit denetimini ve satışta bir açıklamayı beraberinde
 * getiriyor. Karşılığı ancak çok müşteride çıkar. Bu modül ürüne özel hiçbir
 * şey içermiyor; başka ürünlere olduğu gibi taşınabilsin diye sade tutuldu.
 *
 * NEDEN AYLIK YOK: ödeme havale ile alınıp elle onaylanıyor. Aylıkta bir
 * müşteri için yılda on iki kez yazışıp onaylamak gerekirdi. Yıllık peşin
 * ayrıca bırakma oranını düşürüyor. Sektördeki iki rakip de yalnızca yıllık
 * satıyor.
 *
 * NEDEN SALON SAYISINA GÖRE DEĞİL: dönem ortasında salon eklenince tutarın
 * değişmesi, elle tahsilatta her seferinde yazışma demekti. Salon sayısı yine
 * /yonetim listesinde görünüyor — Kurumsal adayını fark etmek için.
 */

/** Yıllık abonelik bedeli. */
export const YEARLY_PRICE = 6000;

/** Bir yıllık erişimin gün karşılığı — yönetim ekranındaki uzatma ile aynı. */
export const YEARLY_DAYS = 365;

/**
 * Aylığa bölünmüş karşılık. Satışta rakamı küçültmek için gösteriliyor;
 * aylık ödeme seçeneği YOK, bu yalnızca bir kıyas.
 */
export const MONTHLY_EQUIVALENT = Math.round(YEARLY_PRICE / 12);

/** Pakete dahil olan her şey — satış sayfası ve abonelik sayfası aynı listeyi kullanır. */
export const PLAN_FEATURES = [
  "Sınırsız salon ve kullanıcı",
  "Takvim, rezervasyon ve talep takibi",
  "Tahsilat planı ve kalan tutar takibi",
  "Teklif ve sözleşme çıktısı",
  "Organizasyon bazlı kârlılık",
  "Gider kategorileri ve raporlar",
  "Rol bazlı finans kısıtı",
];

export type SubscriptionInfo = {
  state: SubscriptionState;
  accessUntil: Date;
  /** İşletme saatine göre kalan gün. Süre dolmuşsa 0. */
  daysLeft: number;
  referenceCode: string;
  /** Uyarı şeridi gösterilmeli mi. */
  isWarning: boolean;
};

/**
 * Aboneliğin durumu — kolondan okunmuyor, türetiliyor.
 *
 * access_until deneme bitişinden ileriyse süre elle uzatılmış, yani ödeme
 * alınmış demektir. Ayrı bir durum kolonu tutulsaydı "ödemesi bitmiş ama
 * durumu aktif kalmış" gibi bir kayma mümkün olurdu.
 */
export function subscriptionInfo(
  // Alanların tamamı değil yalnızca gerekenleri: yönetim ekranındaki
  // admin_businesses() satırı da aynı hesabı kullanabilsin.
  subscription: Pick<
    Subscription,
    "trial_ends_at" | "access_until" | "reference_code"
  >,
  now: Date = new Date(),
): SubscriptionInfo {
  const accessUntil = new Date(subscription.access_until);
  const trialEndsAt = new Date(subscription.trial_ends_at);
  const expired = accessUntil.getTime() <= now.getTime();

  const state: SubscriptionState = expired
    ? "sona_erdi"
    : accessUntil.getTime() > trialEndsAt.getTime()
      ? "abone"
      : "deneme";

  // Gün sayısı işletme saatine göre: sunucu UTC'de çalıştığı için takvim günü
  // farkını doğrudan hesaplamak Türkiye'de gece yarısından sonra bir gün
  // kaydırıyordu.
  const daysLeft = expired
    ? 0
    : Math.max(0, differenceInCalendarDays(today(accessUntil), today(now)));

  return {
    state,
    accessUntil,
    daysLeft,
    referenceCode: subscription.reference_code,
    isWarning: expired || daysLeft <= SUBSCRIPTION_WARNING_DAYS,
  };
}

/**
 * Süre uzatma talebi için hazır WhatsApp metni.
 *
 * İşletme adı ve referans kodu birlikte: aynı isimde iki salon olduğunda
 * hangisinin uzatılacağı kodla ayırt ediliyor.
 */
export function subscriptionWhatsAppMessage({
  state,
  businessName,
  referenceCode,
  email,
  withPlan,
}: {
  state: SubscriptionState;
  businessName: string;
  referenceCode: string;
  email: string | null;
  /** true ise mesajda yıllık abonelik bedeli de yazılır. */
  withPlan?: boolean;
}): string {
  const acilis =
    state === "sona_erdi"
      ? "Merhaba, DavetPro hesabımın süresi doldu. Aboneliğimi uzatmak istiyorum."
      : state === "deneme"
        ? "Merhaba, DavetPro deneme sürem doluyor. Aboneliğimi uzatmak istiyorum."
        : "Merhaba, DavetPro aboneliğimi uzatmak istiyorum.";

  const satirlar = [acilis, "", `İşletme: ${businessName} (${referenceCode})`];
  if (email) satirlar.push(`Hesap: ${email}`);
  // Hangi dönemi istediği mesajda yazılı olsun; yazışmada tekrar sormaya gerek
  // kalmıyor ve süre uzatılırken kaç gün ekleneceği net.
  if (withPlan) satirlar.push(`Plan: Yıllık (${YEARLY_PRICE} TL)`);
  return satirlar.join("\n");
}

export function subscriptionWhatsAppLink(
  args: Parameters<typeof subscriptionWhatsAppMessage>[0],
): string | null {
  return whatsAppLink(BILLING_WHATSAPP, subscriptionWhatsAppMessage(args));
}
