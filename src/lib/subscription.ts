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
}: {
  state: SubscriptionState;
  businessName: string;
  referenceCode: string;
  email: string | null;
}): string {
  const acilis =
    state === "sona_erdi"
      ? "Merhaba, DavetPro hesabımın süresi doldu. Aboneliğimi uzatmak istiyorum."
      : state === "deneme"
        ? "Merhaba, DavetPro deneme sürem doluyor. Aboneliğimi uzatmak istiyorum."
        : "Merhaba, DavetPro aboneliğimi uzatmak istiyorum.";

  const satirlar = [acilis, "", `İşletme: ${businessName} (${referenceCode})`];
  if (email) satirlar.push(`Hesap: ${email}`);
  return satirlar.join("\n");
}

export function subscriptionWhatsAppLink(
  args: Parameters<typeof subscriptionWhatsAppMessage>[0],
): string | null {
  return whatsAppLink(BILLING_WHATSAPP, subscriptionWhatsAppMessage(args));
}
