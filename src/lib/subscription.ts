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
 * Fiyatlandırma: TEK PAKET, iki dönem — 6 ay ve 12 ay.
 *
 * NEDEN KADEME YOK: kademe, her yeni özellikte "bu hangi pakette" sorusunu,
 * yükseltme yolunu, limit denetimini ve satışta bir açıklamayı beraberinde
 * getiriyor. Karşılığı ancak çok müşteride çıkar. Bu modül ürüne özel hiçbir
 * şey içermiyor; başka ürünlere olduğu gibi taşınabilsin diye sade tutuldu.
 *
 * NEDEN AYLIK YOK: ödeme havale ile alınıp elle onaylanıyor. Aylıkta bir
 * müşteri için yılda on iki kez yazışıp onaylamak gerekirdi. Altı ay, yıllık
 * peşine hazır olmayan müşteri için giriş kapısı.
 *
 * NEDEN SALON SAYISINA GÖRE DEĞİL: dönem ortasında salon eklenince tutarın
 * değişmesi, elle tahsilatta her seferinde yazışma demekti. Salon sayısı yine
 * /yonetim listesinde görünüyor — Kurumsal adayını fark etmek için.
 */

/** Aylık taban fiyat. Dönem bedelleri bundan türetiliyor. */
export const MONTHLY_PRICE = 500;

/** 12 aylık dönemde ödenmeyen ay sayısı. */
export const FREE_MONTHS_YEARLY = 1;

export type BillingPeriod = "alti-ay" | "on-iki-ay";

export type BillingTerm = {
  id: BillingPeriod;
  label: string;
  months: number;
  /** Ödenen ay sayısı; 12 aylıkta bir ay alınmıyor. */
  paidMonths: number;
  price: number;
  /** Erişim gün karşılığı — yönetim ekranındaki uzatma ile aynı birim. */
  days: number;
  featured?: boolean;
};

function term(
  id: BillingPeriod,
  label: string,
  months: number,
  bedavaAy: number,
  featured?: boolean,
): BillingTerm {
  const paidMonths = months - bedavaAy;
  return {
    id,
    label,
    months,
    paidMonths,
    price: MONTHLY_PRICE * paidMonths,
    // 30 gün/ay: yönetim ekranı gün ekliyor, ay değil.
    days: months * 30,
    featured,
  };
}

/**
 * Dönemler. Bedeller taban fiyattan HESAPLANIYOR, elle yazılmıyor — böylece
 * "1 ay ücretsiz" ifadesi ile fiyat birbirinden ayrışamıyor.
 */
export const BILLING_TERMS: BillingTerm[] = [
  term("alti-ay", "6 ay", 6, 0),
  term("on-iki-ay", "12 ay", 12, FREE_MONTHS_YEARLY, true),
];

/** 12 aylık dönemde cepte kalan tutar. */
export const YEARLY_SAVING = MONTHLY_PRICE * FREE_MONTHS_YEARLY;

/** Satış sayfasında gösterilen giriş bedeli — en kısa dönem. */
export const ENTRY_TERM = BILLING_TERMS[0];
export const YEARLY_TERM = BILLING_TERMS[1];

/** Pakete dahil olan her şey — satış sayfası ve abonelik sayfası aynı listeyi kullanır. */
export const PLAN_FEATURES = [
  "Sınırsız salon ve kullanıcı",
  "Takvim, rezervasyon ve talep takibi",
  // "Tahsilat planı" taksit çağrıştırıyordu; üründe taksit tablosu yok.
  "Kapora, tahsilat ve kalan tutar takibi",
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
  term,
}: {
  state: SubscriptionState;
  businessName: string;
  referenceCode: string;
  email: string | null;
  /** Verilirse mesajda seçilen dönem ve bedeli yazılır. */
  term?: BillingTerm;
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
  if (term) satirlar.push(`Plan: ${term.label} (${term.price} TL)`);
  return satirlar.join("\n");
}

export function subscriptionWhatsAppLink(
  args: Parameters<typeof subscriptionWhatsAppMessage>[0],
): string | null {
  return whatsAppLink(BILLING_WHATSAPP, subscriptionWhatsAppMessage(args));
}
