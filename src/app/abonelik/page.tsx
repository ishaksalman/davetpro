import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CalendarClock } from "lucide-react";
import { logoutAction } from "@/app/(auth)/actions";
import { Logo } from "@/components/brand/logo";
import { CopyValue } from "@/components/shared/copy-value";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { requireSessionAllowExpired } from "@/lib/auth";
import { env } from "@/lib/env";
import { formatDate } from "@/lib/format";
import {
  BILLING_PLANS,
  BILLING_WHATSAPP,
  TRIAL_DAYS,
  subscriptionWhatsAppLink,
  type SubscriptionInfo,
} from "@/lib/subscription";
import { PlanCard } from "./plan-card";

export const metadata: Metadata = {
  title: "Abonelik",
  robots: { index: false, follow: false },
};

/**
 * Süresi dolan hesapların yönlendirildiği sayfa; uyarı şeridinden de açılıyor.
 *
 * (app) düzeninin DIŞINDA: o düzen requireSession() çağırıyor, süresi dolmuş
 * kullanıcı buraya yönlendirildiğinde sonsuz döngüye girerdi. Kenar çubuğunun
 * olmaması ayrıca doğru — kilitli hesaba çalışmayan menüler göstermemek gerek.
 */
export default async function AbonelikPage() {
  const { business, user, subscription } = await requireSessionAllowExpired();

  const suresiDoldu = subscription?.state === "sona_erdi";
  const havale = env.billing;
  const whatsapp = subscription
    ? subscriptionWhatsAppLink({
        state: subscription.state,
        businessName: business.name,
        referenceCode: subscription.referenceCode,
        email: user.email,
      })
    : null;

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-xl flex-col justify-center gap-8 px-6 py-12">
      <Logo />

      <div className="rounded-xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className={
              suresiDoldu
                ? "mt-0.5 rounded-lg bg-rose-100 p-2 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                : "mt-0.5 rounded-lg bg-amber-100 p-2 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
            }
          >
            {suresiDoldu ? (
              <AlertTriangle className="size-5" />
            ) : (
              <CalendarClock className="size-5" />
            )}
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight">
              {suresiDoldu ? "Erişim süreniz doldu" : "Aboneliğiniz"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {baslikMetni(subscription, business.name)}
            </p>
          </div>
        </div>

        {/*
          Veriler duruyor: kilit erişimi kapatıyor, kaydı silmiyor. Kullanıcının
          en çok merak ettiği şey bu, açıkça yazıyoruz.
        */}
        {suresiDoldu && (
          <p className="mt-4 rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
            Rezervasyon, müşteri ve tahsilat kayıtlarınız yerinde duruyor. Süre
            uzatıldığı anda kaldığınız yerden devam edersiniz.
          </p>
        )}

        <Separator className="my-6" />

        <h2 className="text-sm font-semibold">Ödeme planı</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {BILLING_PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              href={
                subscription
                  ? subscriptionWhatsAppLink({
                      state: subscription.state,
                      businessName: business.name,
                      referenceCode: subscription.referenceCode,
                      email: user.email,
                      plan,
                    })
                  : null
              }
            />
          ))}
        </div>

        <Separator className="my-6" />

        {havale ? (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold">Havale ile ödeme</h2>
            <dl className="space-y-3">
              {havale.accountName && (
                <Satir label="Alıcı">{havale.accountName}</Satir>
              )}
              {havale.bank && <Satir label="Banka">{havale.bank}</Satir>}
              <Satir label="IBAN">
                <CopyValue value={havale.iban} className="font-mono" />
              </Satir>
              {subscription && (
                <Satir label="Açıklama">
                  <CopyValue
                    value={subscription.referenceCode}
                    className="font-mono"
                  />
                </Satir>
              )}
            </dl>
            {/*
              Açıklama alanı zorunlu: gelen havaleyi hesaba bağlayan tek şey bu
              kod. Yazılmazsa ödeme kimin olduğu anlaşılmadan bekler.
            */}
            <p className="text-xs text-muted-foreground">
              Açıklamaya referans kodunu yazmayı unutmayın — ödemeyi hesabınıza
              bağlayan tek bilgi bu. Havaleyi yaptıktan sonra aşağıdaki
              düğmeden bize bildirin, süreniz kısa sürede uzatılır.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">Ödeme</h2>
            <p className="text-sm text-muted-foreground">
              Ödeme havale ile alınıyor. Hesap bilgileri ve tutar için
              WhatsApp&apos;tan bize ulaşın.
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          {/* Plan seçmeden yazmak isteyen için: mesajda dönem geçmez. */}
          {whatsapp && (
            <Button asChild variant="outline" className="sm:flex-1">
              <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                Soru sor ({BILLING_WHATSAPP})
              </a>
            </Button>
          )}
          {!suresiDoldu && (
            <Button asChild variant="ghost">
              <Link href="/panel">
                <ArrowLeft className="size-4" />
                Panele dön
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span className="truncate">{user.email}</span>
        <form action={logoutAction}>
          <Button type="submit" variant="ghost" size="sm">
            Çıkış yap
          </Button>
        </form>
      </div>
    </main>
  );
}

function Satir({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 last:border-0 last:pb-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  );
}

function baslikMetni(
  subscription: SubscriptionInfo | null,
  businessName: string,
): string {
  // Abonelik okunamadıysa uydurma bir tarih göstermiyoruz.
  if (!subscription) {
    return `${businessName} için abonelik bilgisi okunamadı. WhatsApp'tan bize ulaşın.`;
  }

  const tarih = formatDate(subscription.accessUntil);

  if (subscription.state === "sona_erdi") {
    return `${businessName} için erişim ${tarih} tarihinde sona erdi.`;
  }
  if (subscription.state === "deneme") {
    return `${TRIAL_DAYS} günlük deneme süreniz ${tarih} tarihinde bitiyor — ${gunMetni(subscription.daysLeft)}.`;
  }
  return `Aboneliğiniz ${tarih} tarihine kadar geçerli — ${gunMetni(subscription.daysLeft)}.`;
}

function gunMetni(daysLeft: number): string {
  return daysLeft === 0 ? "bugün son gün" : `${daysLeft} gün kaldı`;
}
