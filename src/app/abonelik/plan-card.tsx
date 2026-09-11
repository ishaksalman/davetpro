import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import {
  MONTHLY_EQUIVALENT,
  PLAN_FEATURES,
  YEARLY_PRICE,
  subscriptionWhatsAppLink,
  type SubscriptionState,
} from "@/lib/subscription";

/**
 * Abonelik bedeli.
 *
 * Dönem seçimi yok — yalnızca yıllık satılıyor, gerekçesi subscription.ts'te.
 * Seçecek bir şey kalmadığı için bu bileşen de istemci tarafında çalışmıyor.
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
  const href = subscriptionWhatsAppLink({
    state,
    businessName,
    referenceCode,
    email,
    withPlan: true,
  });

  return (
    <div>
      <h2 className="text-sm font-semibold">Abonelik bedeli</h2>

      <div className="mt-3 rounded-lg border-2 border-primary p-5">
        <p className="text-3xl font-semibold tracking-tight">
          {formatMoney(YEARLY_PRICE)}
          <span className="text-sm font-normal text-muted-foreground"> / yıl</span>
        </p>

        {/*
          Aylık ödeme seçeneği YOK; bu yalnızca rakamı kavramayı kolaylaştıran
          bir bölme. "2 ay ücretsiz" demiyoruz — karşılaştırılacak bir aylık
          fiyat olmadığı için neye göre ücretsiz olduğu belirsiz kalırdı.
        */}
        <p className="mt-1 text-xs text-muted-foreground">
          365 gün · ayda {formatMoney(MONTHLY_EQUIVALENT)}&apos;ye denk geliyor
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
              Abone olmak istiyorum
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
