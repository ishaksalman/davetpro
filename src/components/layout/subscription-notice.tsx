import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { formatDate } from "@/lib/format";
import { TRIAL_DAYS, type SubscriptionInfo } from "@/lib/subscription";
import { cn } from "@/lib/utils";

/**
 * Deneme süresi boyunca ve abonelik bitimine az kaldığında uygulamanın
 * tepesinde duran bilgi şeridi.
 *
 * Düğme yok, metin içinde bir bağlantı var: şerit her ekranın üstünde
 * duruyor, düğme koymak onu bir eylem çubuğuna çevirip içeriğin yerini
 * alıyordu. Bağlantı abonelik sayfasına götürüyor; ödeme, havale bilgileri ve
 * WhatsApp orada.
 *
 * İki tonu var: deneme rahat rahat sürerken nötr, son günlerde sarı. Otuz gün
 * boyunca aynı sarıyı göstermek uyarıyı görünmez hale getirirdi — asıl acil
 * olduğu anda fark edilmesini istiyoruz.
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
  const acil = subscription.isWarning;
  const kalan =
    subscription.daysLeft === 0
      ? "bugün doluyor"
      : `${subscription.daysLeft} gün kaldı`;

  return (
    <div
      className={cn(
        "border-b",
        acil
          ? "border-amber-200/70 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/40"
          : "bg-muted/40",
      )}
    >
      {/*
        İkon ve bağlantı metnin akışında: ayrı flex öğesi olduklarında dar
        ekranda ikon tek başına bir satıra, bağlantı da bir alt satıra
        düşüyordu. Böyle tek paragraf gibi sarıyor.
      */}
      <div
        className={cn(
          "flex items-start gap-2 px-4 py-1.5 text-[0.8125rem] sm:items-center sm:px-6",
          acil ? "text-amber-900 dark:text-amber-200" : "text-muted-foreground",
        )}
      >
        <CalendarClock className="mt-0.5 size-3.5 shrink-0 sm:mt-0" aria-hidden />
        <p className="min-w-0">
          <span className="font-medium">
            {deneme ? `${TRIAL_DAYS} günlük deneme süreniz` : "Aboneliğiniz"}{" "}
            {formatDate(subscription.accessUntil)} tarihinde bitiyor
          </span>{" "}
          — {kalan}.{" "}
          <Link
            href="/abonelik"
            // Nötr tonda metin soluk; bağlantı seçilebilsin diye tam renkte.
            className={cn(
              "font-medium whitespace-nowrap underline underline-offset-2 hover:no-underline",
              !acil && "text-foreground",
            )}
          >
            {deneme ? "Şimdi abone ol" : "Şimdi yenile"}
          </Link>
        </p>
      </div>
    </div>
  );
}
