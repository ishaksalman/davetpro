"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import {
  FREE_MONTHS_YEARLY,
  PERIOD_LABELS,
  PERIOD_SUFFIX,
  PLAN_FEATURES,
  YEARLY_MONTHLY_EQUIVALENT,
  YEARLY_SAVING,
  priceFor,
  subscriptionWhatsAppLink,
  type BillingPeriod,
  type SubscriptionState,
} from "@/lib/subscription";
import { cn } from "@/lib/utils";

const PERIODS: BillingPeriod[] = ["aylik", "yillik"];

/**
 * Abonelik bedeli ve dönem seçimi.
 *
 * Seçim sunucuya kaydedilmiyor — ödeme havale ile alınıp elle onaylandığı için
 * seçilen dönem ile ödenen tutarın aynı olma garantisi yok; kaydetmek
 * doğruluğu garanti olmayan bir bilgi tutmak olurdu. Seçimin tek işlevi
 * WhatsApp mesajına yazılmak.
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

  const yillik = period === "yillik";
  const href = subscriptionWhatsAppLink({
    state,
    businessName,
    referenceCode,
    email,
    plan: { period },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Abonelik bedeli</h2>
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

      <div className="mt-4 rounded-lg border-2 border-primary p-5">
        <p className="text-3xl font-semibold tracking-tight">
          {formatMoney(priceFor(period))}
          <span className="text-sm font-normal text-muted-foreground">
            {" "}
            {PERIOD_SUFFIX[period]}
          </span>
        </p>

        <p className="mt-1 text-xs text-muted-foreground">
          {yillik
            ? `Ayda ${formatMoney(YEARLY_MONTHLY_EQUIVALENT)} — ${formatMoney(YEARLY_SAVING)} tasarruf`
            : "Salon ve kullanıcı sayısına bakılmaksızın tek fiyat"}
        </p>

        <ul className="mt-4 grid gap-2 border-t pt-4 sm:grid-cols-2">
          {PLAN_FEATURES.map((f) => (
            <li key={f} className="flex gap-2 text-xs text-muted-foreground">
              <Check className="mt-0.5 size-3 shrink-0 text-primary" strokeWidth={3} />
              {f}
            </li>
          ))}
        </ul>

        {href && (
          <Button asChild className="mt-5 w-full">
            <a href={href} target="_blank" rel="noopener noreferrer">
              {PERIOD_LABELS[period]} ödemek istiyorum
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
