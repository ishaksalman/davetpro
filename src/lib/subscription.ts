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

export type BillingPlan = {
  id: "aylik" | "yillik";
  label: string;
  /** Dönem bedeli (TL). */
  price: number;
  /** "ay" / "yıl" — fiyatın yanında gösterilir. */
  period: string;
  /** Bu ödemenin karşılığı olan gün sayısı; yönetim ekranındaki uzatma ile aynı. */
  days: number;
};

/**
 * Abonelik planları.
 *
 * Tek pakette tutuldu: salon sayısı veya kullanıcı sayısına göre kademe YOK,
 * çünkü sistem o limitleri hiçbir yerde denetlemiyor. Denetlenmeyen bir limiti
 * fiyat listesinde söz vermek, tutulmayacak bir söz olur.
 *
 * Yıllıkta 12 ay yerine 10 ay ücreti alınıyor (2 ay ücretsiz).
 */
export const BILLING_PLANS: BillingPlan[] = [
  { id: "aylik", label: "Aylık", price: 500, period: "ay", days: 30 },
  { id: "yillik", label: "Yıllık", price: 5000, period: "yıl", days: 365 },
];

/** Yıllık ödemede kalan tutar — "2 ay ücretsiz" iddiasını hesapla doğruluyor. */
export function yearlySaving(): number {
  const aylik = BILLING_PLANS.find((p) => p.id === "aylik");
  const yillik = BILLING_PLANS.find((p) => p.id === "yillik");
  if (!aylik || !yillik) return 0;
  return aylik.price * 12 - yillik.price;
}

/** Yıllık ödemenin aya bölünmüş karşılığı. */
export function yearlyMonthlyEquivalent(): number {
  const yillik = BILLING_PLANS.find((p) => p.id === "yillik");
  return yillik ? Math.round(yillik.price / 12) : 0;
}

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
  plan,
}: {
  state: SubscriptionState;
  businessName: string;
  referenceCode: string;
  email: string | null;
  /** Seçilen plan; verilmezse mesajda dönem belirtilmez. */
  plan?: BillingPlan;
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
  if (plan) satirlar.push(`Plan: ${plan.label} (${plan.price} TL / ${plan.period})`);
  return satirlar.join("\n");
}

export function subscriptionWhatsAppLink(
  args: Parameters<typeof subscriptionWhatsAppMessage>[0],
): string | null {
  return whatsAppLink(BILLING_WHATSAPP, subscriptionWhatsAppMessage(args));
}
