"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import {
  BILLING_PACKAGES,
  FREE_MONTHS_YEARLY,
  PERIOD_LABELS,
  PERIOD_SUFFIX,
  monthlyEquivalent,
  packagePrice,
  subscriptionWhatsAppLink,
  yearlySaving,
  type BillingPackage,
  type BillingPeriod,
  type SubscriptionState,
} from "@/lib/subscription";
import { cn } from "@/lib/utils";

const PERIODS: BillingPeriod[] = ["aylik", "yillik"];

/**
 * Paket ve dönem seçimi.
 *
 * Seçim sunucuya gönderilmiyor — ödeme havale ile alınıp elle onaylandığı için
 * seçimin tek işlevi WhatsApp mesajına hangi paketin istendiğini yazmak.
 * Kayıt tutmak yanıltıcı olurdu: seçilen plan ile ödenen tutar aynı olmak
 * zorunda değil.
 */
export function PlanSelector({
  state,
  businessName,
  referenceCode,
  email,
}: {
  state: SubscriptionState;
  businessName: string;
  referenceCode: string;
  email: string | null;
}) {
  // Aylık varsayılan: önce en düşük rakamı göstermek daha dürüst.
  const [period, setPeriod] = useState<BillingPeriod>("aylik");

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Paketler</h2>
        <div
          role="radiogroup"
          aria-label="Ödeme dönemi"
          className="inline-flex rounded-lg bg-muted p-0.5"
        >
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={period === p}
              onClick={() => setPeriod(p)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                period === p
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {PERIOD_LABELS[p]}
              {p === "yillik" && (
                <span className="ml-1.5 text-[0.6875rem] text-emerald-600 dark:text-emerald-400">
                  {FREE_MONTHS_YEARLY} ay ücretsiz
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {BILLING_PACKAGES.map((pkg) => (
          <PackageCard
            key={pkg.id}
            pkg={pkg}
            period={period}
            href={subscriptionWhatsAppLink({
              state,
              businessName,
              referenceCode,
              email,
              plan: { pkg, period },
            })}
          />
        ))}
      </div>
    </div>
  );
}

function PackageCard({
  pkg,
  period,
  href,
}: {
  pkg: BillingPackage;
  period: BillingPeriod;
  href: string | null;
}) {
  const yillik = period === "yillik";

  return (
    // flex + mt-auto: özellik listeleri farklı uzunlukta, düğmeler aksi halde
    // farklı yükseklikte duruyordu.
    <div
      className={cn(
        "flex h-full flex-col rounded-lg p-4",
        pkg.featured ? "border-2 border-primary" : "border",
      )}
    >
      <p className="text-sm font-medium">{pkg.name}</p>

      <p className="mt-1 text-2xl font-semibold tracking-tight">
        {formatMoney(packagePrice(pkg, period))}
        <span className="text-sm font-normal text-muted-foreground">
          {" "}
          {PERIOD_SUFFIX[period]}
        </span>
      </p>

      <p className="mt-1 text-xs text-muted-foreground">
        {yillik
          ? `Ayda ${formatMoney(monthlyEquivalent(pkg))} — ${formatMoney(yearlySaving(pkg))} tasarruf`
          : pkg.note}
      </p>

      <ul className="mt-4 flex flex-1 flex-col gap-2">
        {pkg.features.map((f) => (
          <li key={f} className="flex gap-2 text-xs text-muted-foreground">
            <Check className="mt-0.5 size-3 shrink-0 text-primary" strokeWidth={3} />
            {f}
          </li>
        ))}
      </ul>

      {href && (
        <Button
          asChild
          variant={pkg.featured ? "default" : "outline"}
          size="sm"
          className="mt-4 w-full"
        >
          <a href={href} target="_blank" rel="noopener noreferrer">
            {pkg.name} istiyorum
          </a>
        </Button>
      )}
    </div>
  );
}
