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

export type BillingPeriod = "aylik" | "yillik";

/**
 * Fiyatlandırma: TEK PAKET, tüm özellikler açık.
 *
 * NEDEN KADEME YOK: kademe, her yeni özellikte "bu hangi pakette" sorusunu,
 * yükseltme yolunu, limit denetimini ve satışta bir açıklamayı beraberinde
 * getiriyor. Bunun karşılığı ancak çok müşteride çıkar. Ayrıca bu modül
 * ürüne özel hiçbir şey içermiyor; başka ürünlere olduğu gibi taşınabilsin
 * diye sade tutuldu.
 *
 * NEDEN SALON SAYISINA GÖRE DEĞİL: ödeme havale ile alınıp elle onaylandığı
 * için dönem ortasında salon eklenince tutarın değişmesi her seferinde
 * yazışma demekti. Sabit rakamda herkes her dönem aynı parayı yatırıyor.
 * Salon sayısı yine /yonetim ekranında görünüyor — Kurumsal adayını
 * fark etmek için.
 */

/** Aylık bedel. Yıllık bundan türetilir. */
export const MONTHLY_PRICE = 600;

/**
 * Yıllık ödemede alınmayan ay sayısı. Yıllık bedel = aylık × (12 − bu sayı).
 * Tek yerde: "2 ay ücretsiz" metni ile fiyatın aynı hesaptan gelmesi gerekiyor.
 */
export const FREE_MONTHS_YEARLY = 2;

/** Pakete dahil olan her şey — satış sayfası ve abonelik sayfası aynı listeyi kullanır. */
export const PLAN_FEATURES = [
  "Sınırsız salon ve kullanıcı",
  "Takvim, rezervasyon ve görüşme takibi",
  "Tahsilat planı ve kalan tutar takibi",
  "Teklif ve sözleşme çıktısı",
  "Organizasyon bazlı kârlılık",
  "Gider kategorileri ve raporlar",
  "Rol bazlı finans kısıtı",
];

export const PERIOD_LABELS: Record<BillingPeriod, string> = {
  aylik: "Aylık",
  yillik: "Yıllık",
};

/** Fiyatın yanında görünen dönem eki. */
export const PERIOD_SUFFIX: Record<BillingPeriod, string> = {
  aylik: "/ ay",
  yillik: "/ yıl",
};

/** Yıllık bedel, aylıktan türetilir. */
export const YEARLY_PRICE = MONTHLY_PRICE * (12 - FREE_MONTHS_YEARLY);

export function priceFor(period: BillingPeriod): number {
  return period === "yillik" ? YEARLY_PRICE : MONTHLY_PRICE;
}

/** Yıllık ödemenin aya bölünmüş karşılığı — kıyaslamayı kolaylaştırır. */
export const YEARLY_MONTHLY_EQUIVALENT = Math.round(YEARLY_PRICE / 12);

/** Yıllık ödemede cepte kalan tutar. */
export const YEARLY_SAVING = MONTHLY_PRICE * 12 - YEARLY_PRICE;

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
  /** Seçilen dönem; verilmezse mesajda plan belirtilmez. */
  plan?: { period: BillingPeriod };
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
  if (plan) {
    satirlar.push(
      `Plan: ${PERIOD_LABELS[plan.period]} (${priceFor(plan.period)} TL)`,
    );
  }
  return satirlar.join("\n");
}

export function subscriptionWhatsAppLink(
  args: Parameters<typeof subscriptionWhatsAppMessage>[0],
): string | null {
  return whatsAppLink(BILLING_WHATSAPP, subscriptionWhatsAppMessage(args));
}
