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

export type BillingPackage = {
  id: "tek_salon" | "coklu_salon";
  name: string;
  note: string;
  features: string[];
  /** Aylık ödeme bedeli (TL). Yıllık bedel bundan türetiliyor. */
  monthlyPrice: number;
  /** Öne çıkarılan paket. */
  featured?: boolean;
};

/**
 * Yıllık ödemede alınmayan ay sayısı. Yıllık bedel = aylık × (12 − bu sayı).
 *
 * Tek yerde: "2 ay ücretsiz" metni ile gösterilen rakamın aynı hesaptan
 * gelmesi gerekiyor, yoksa metin ile fiyat birbirini tutmaz.
 */
export const FREE_MONTHS_YEARLY = 2;

/**
 * Abonelik paketleri.
 *
 * Aynı liste hem satış sayfasında hem uygulama içindeki abonelik sayfasında
 * kullanılıyor. İki yerde ayrı yazılsaydı biri güncellenmeyip müşteriye iki
 * farklı fiyat gösterilebilirdi.
 *
 * DİKKAT: Buradaki salon/kullanıcı limitleri sistemde DENETLENMİYOR; şu an
 * yalnızca fiyat listesi metni.
 */
export const BILLING_PACKAGES: BillingPackage[] = [
  {
    id: "tek_salon",
    name: "Tek Salon",
    monthlyPrice: 500,
    note: "Tek salonu olan işletmeler için.",
    features: [
      "1 salon, 3 kullanıcı",
      "Takvim ve rezervasyon",
      "Tahsilat ve ödeme planı",
      "Sözleşme ve teklif çıktısı",
    ],
  },
  {
    id: "coklu_salon",
    name: "Çoklu Salon",
    monthlyPrice: 1000,
    note: "Birden fazla salon ve bahçe işletenler için.",
    featured: true,
    features: [
      "Sınırsız salon, 10 kullanıcı",
      "Tek Salon'daki her şey",
      "Organizasyon bazlı kârlılık",
      "Gider kategorileri ve raporlar",
      "Rol bazlı finans kısıtı",
    ],
  },
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

/** Seçilen dönemin bedeli. */
export function packagePrice(pkg: BillingPackage, period: BillingPeriod): number {
  return period === "yillik"
    ? pkg.monthlyPrice * (12 - FREE_MONTHS_YEARLY)
    : pkg.monthlyPrice;
}

/** Yıllık ödemenin aya bölünmüş karşılığı — kıyaslamayı kolaylaştırır. */
export function monthlyEquivalent(pkg: BillingPackage): number {
  return Math.round(packagePrice(pkg, "yillik") / 12);
}

/** Yıllık ödemede cepte kalan tutar. */
export function yearlySaving(pkg: BillingPackage): number {
  return pkg.monthlyPrice * 12 - packagePrice(pkg, "yillik");
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
  /** Seçilen paket ve dönem; verilmezse mesajda plan belirtilmez. */
  plan?: { pkg: BillingPackage; period: BillingPeriod };
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
    const bedel = packagePrice(plan.pkg, plan.period);
    satirlar.push(
      `Plan: ${plan.pkg.name} — ${PERIOD_LABELS[plan.period]} (${bedel} TL)`,
    );
  }
  return satirlar.join("\n");
}

export function subscriptionWhatsAppLink(
  args: Parameters<typeof subscriptionWhatsAppMessage>[0],
): string | null {
  return whatsAppLink(BILLING_WHATSAPP, subscriptionWhatsAppMessage(args));
}
