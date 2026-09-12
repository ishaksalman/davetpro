import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
import { formatDate } from "@/lib/format";
import {
  TRIAL_DAYS,
  subscriptionWhatsAppLink,
  type SubscriptionInfo,
} from "@/lib/subscription";
import { cn } from "@/lib/utils";

/**
 * Deneme süresi boyunca ve abonelik bitimine az kaldığında uygulamanın
 * tepesinde duran bilgi kutusu.
 *
 * İki tonu var: deneme rahat rahat sürerken sakin (nötr zemin), son günlerde
 * ve süre dolduğunda uyarı (amber). Otuz gün boyunca aynı turuncu şeridi
 * göstermek uyarıyı görünmez hale getirirdi — asıl acil olduğu anda fark
 * edilmesini istiyoruz.
 *
 * Kapatılabilir değil: kapatılırsa kullanıcı süresinin dolduğunu ancak
 * kilitlendiği gün fark eder.
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
    withPlan: true,
  });

  const acil = subscription.isWarning;
  const deneme = subscription.state === "deneme";
  const kalan =
    subscription.daysLeft === 0
      ? "bugün doluyor"
      : `${subscription.daysLeft} gün kaldı`;

  return (
    <div
      className={cn(
        "border-b",
        acil ? "bg-amber-50 dark:bg-amber-950/40" : "bg-muted/50",
      )}
    >
      {/*
        basis-full: dar ekranda metin tüm satırı alıyor, düğmeler alta geçiyor.
        Aksi halde flex-1 sonsuz daralıyor ve cümle düğmelerin yanında on
        satıra iniyordu.
      */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
        <p
          className={cn(
            "flex min-w-0 flex-1 basis-full items-start gap-2.5 text-sm sm:basis-auto sm:items-center",
            acil
              ? "text-amber-900 dark:text-amber-200"
              : "text-muted-foreground",
          )}
        >
          <CalendarClock
            className={cn(
              "mt-0.5 size-4 shrink-0 sm:mt-0",
              acil
                ? "text-amber-700 dark:text-amber-400"
                : "text-muted-foreground",
            )}
            aria-hidden
          />
          <span>
            <span className="font-medium">
              {deneme ? `${TRIAL_DAYS} günlük deneme süreniz` : "Aboneliğiniz"}{" "}
              {formatDate(subscription.accessUntil)} tarihinde bitiyor
            </span>{" "}
            — {kalan}.
            {/* Sonucu yalnızca acil durumda yazıyoruz; deneme yeni başlamışken
              her ekranda tekrar etmesi gereksiz baskı olurdu. */}
            {acil &&
              " Süre dolduğunda kayıtlarınız korunur ama panele erişemezsiniz."}
          </span>
        </p>
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className={cn(acil && "text-amber-900 dark:text-amber-200")}
          >
            <Link href="/abonelik">Abonelik</Link>
          </Button>
          {whatsapp && (
            <Button
              asChild
              size="sm"
              variant={acil ? "default" : "outline"}
              className={cn(
                !acil && "bg-[#25D366]/10 hover:bg-[#25D366] hover:text-white",
              )}
            >
              <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon />
                {/* Zaten abone olana "Abone ol" demek yanlış. */}
                {deneme ? "Abone ol" : "Süreyi uzat"}
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
