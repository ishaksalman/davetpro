import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { formatDate } from "@/lib/format";
import { TRIAL_DAYS, type SubscriptionInfo } from "@/lib/subscription";

/**
 * Deneme süresi boyunca ve abonelik bitimine az kaldığında uygulamanın
 * tepesinde duran bilgi şeridi.
 *
 * Düğme yok, metin içinde bir bağlantı var: şerit her ekranın üstünde
 * duruyor, düğme koymak onu bir eylem çubuğuna çevirip içeriğin yerini
 * alıyordu. Bağlantı abonelik sayfasına götürüyor; ödeme, havale bilgileri ve
 * WhatsApp orada.
 *
 * Kapatılabilir değil: kapatılırsa kullanıcı süresinin dolduğunu ancak
 * kilitlendiği gün fark eder.
 *
 * Süresi dolmuş hesap buraya hiç gelmiyor — requireSession() onu /abonelik'e
 * yönlendiriyor.
 */
export function SubscriptionNotice({
  subscription,
}: {
  subscription: SubscriptionInfo;
}) {
  const deneme = subscription.state === "deneme";
  const kalan =
    subscription.daysLeft === 0
      ? "bugün doluyor"
      : `${subscription.daysLeft} gün kaldı`;

  return (
    <div className="border-b border-amber-200/70 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/40">
      {/*
        İkon ve bağlantı metnin akışında: ayrı flex öğesi olduklarında dar
        ekranda ikon tek başına bir satıra, bağlantı da bir alt satıra
        düşüyordu. Böyle tek paragraf gibi sarıyor.
      */}
      <div className="flex items-start gap-2 px-4 py-1.5 text-[0.8125rem] text-amber-900 sm:items-center sm:px-6 dark:text-amber-200">
        <CalendarClock className="mt-0.5 size-3.5 shrink-0 sm:mt-0" aria-hidden />
        <p className="min-w-0">
          <span className="font-medium">
            {deneme ? `${TRIAL_DAYS} günlük deneme süreniz` : "Aboneliğiniz"}{" "}
            {formatDate(subscription.accessUntil)} tarihinde bitiyor
          </span>{" "}
          — {kalan}.{" "}
          <Link
            href="/abonelik"
            className="font-medium whitespace-nowrap underline underline-offset-2 hover:no-underline"
          >
            {deneme ? "Şimdi abone ol" : "Şimdi yenile"}
          </Link>
        </p>
      </div>
    </div>
  );
}
