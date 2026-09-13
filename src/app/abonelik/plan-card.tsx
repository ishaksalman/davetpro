"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import {
  BILLING_TERMS,
  FREE_MONTHS_YEARLY,
  MONTHLY_PRICE,
  PLAN_FEATURES,
  subscriptionWhatsAppLink,
  type BillingPeriod,
  type SubscriptionState,
} from "@/lib/subscription";
import { cn } from "@/lib/utils";

/**
 * Abonelik bedeli ve dönem seçimi.
 *
 * Seçim sunucuya kaydedilmiyor — ödeme havale ile alınıp elle onaylandığı için
 * seçilen dönem ile ödenen tutarın aynı olma garantisi yok; kaydetmek
 * doğruluğu garanti olmayan bir bilgi tutmak olurdu. Seçimin tek işlevi
 * WhatsApp mesajına yazılmak.
 */
export function PlanCard({
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
  // 12 ay varsayılan: ücretsiz ay orada ve uzun dönem iki taraf için de daha az iş.
  const [secili, setSecili] = useState<BillingPeriod>("on-iki-ay");
  const term = BILLING_TERMS.find((t) => t.id === secili) ?? BILLING_TERMS[0];

  const href = subscriptionWhatsAppLink({
    state,
    businessName,
    referenceCode,
    email,
    term,
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Abonelik bedeli</h2>
        <div
          role="radiogroup"
          aria-label="Abonelik dönemi"
          className="inline-flex rounded-lg bg-muted p-0.5"
        >
          {BILLING_TERMS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={secili === t.id}
              onClick={() => setSecili(t.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                secili === t.id
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              {t.months - t.paidMonths > 0 && (
                <span className="ml-1.5 text-[0.6875rem] text-emerald-600 dark:text-emerald-400">
                  {t.months - t.paidMonths} ay ücretsiz
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-lg border-2 border-primary p-5">
        <p className="text-3xl font-semibold tracking-tight">
          {formatMoney(term.price)}
          <span className="text-sm font-normal text-muted-foreground">
            {" "}
            / {term.label}
          </span>
        </p>

        {/*
          Dökümü açıkça yazıyoruz: "1 ay ücretsiz" ifadesinin rakamla
          tuttuğu görülebilsin.
        */}
        <p className="mt-1 text-xs text-muted-foreground">
          {term.months * 30} gün ·{" "}
          {term.paidMonths < term.months ? (
            <>
              {term.paidMonths} ay ödersiniz, {FREE_MONTHS_YEARLY} ay ücretsiz —{" "}
              {formatMoney(MONTHLY_PRICE * FREE_MONTHS_YEARLY)} tasarruf
            </>
          ) : (
            <>ayda {formatMoney(MONTHLY_PRICE)}</>
          )}
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
              {term.label} abone olmak istiyorum
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
