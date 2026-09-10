import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import {
  TRIAL_DAYS,
  subscriptionWhatsAppLink,
  type SubscriptionInfo,
} from "@/lib/subscription";

/**
 * Süre bitimine az kalmışsa uygulamanın tepesinde duran bilgi kutusu.
 *
 * Kapatılabilir değil: kapatılırsa kullanıcı süresinin dolduğunu ancak
 * kilitlendiği gün fark eder. Yalnızca son günlerde göründüğü için sürekli
 * ekranda durmuyor.
 *
 * Süresi dolmuş hesap buraya hiç gelmiyor — requireSession() onu /abonelik'e
 * yönlendiriyor.
 */
export function SubscriptionNotice({
  subscription,
  businessName,
  email,
}: {
  subscription: SubscriptionInfo;
  businessName: string;
  email: string | null;
}) {
  const whatsapp = subscriptionWhatsAppLink({
    state: subscription.state,
    businessName,
    referenceCode: subscription.referenceCode,
    email,
  });

  const deneme = subscription.state === "deneme";
  const kalan =
    subscription.daysLeft === 0
      ? "bugün doluyor"
      : `${subscription.daysLeft} gün kaldı`;

  return (
    <div className="border-b bg-amber-50 dark:bg-amber-950/40">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <CalendarClock
          className="size-4 shrink-0 text-amber-700 dark:text-amber-400"
          aria-hidden
        />
        <p className="min-w-0 flex-1 text-sm text-amber-900 dark:text-amber-200">
          <span className="font-medium">
            {deneme ? `${TRIAL_DAYS} günlük deneme süreniz` : "Aboneliğiniz"}{" "}
            {formatDate(subscription.accessUntil)} tarihinde bitiyor
          </span>{" "}
          — {kalan}. Süre dolduğunda kayıtlarınız korunur ama panele
          erişemezsiniz.
        </p>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="text-amber-900 dark:text-amber-200">
            <Link href="/abonelik">Havale bilgileri</Link>
          </Button>
          {whatsapp && (
            <Button asChild size="sm">
              <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                Süreyi uzat
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
