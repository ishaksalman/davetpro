import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import {
  yearlyMonthlyEquivalent,
  yearlySaving,
  type BillingPlan,
} from "@/lib/subscription";

/** Abonelik sayfasındaki tek plan kartı. */
export function PlanCard({ plan, href }: { plan: BillingPlan; href: string | null }) {
  const yillik = plan.id === "yillik";
  const tasarruf = yearlySaving();

  return (
    <div
      // flex + mt-auto: açıklama metinleri farklı satır sayısında olduğu için
      // düğmeler aksi halde farklı yükseklikte duruyordu.
      className={
        yillik
          ? "relative flex h-full flex-col rounded-lg border-2 border-primary p-4"
          : "relative flex h-full flex-col rounded-lg border p-4"
      }
    >
      {yillik && tasarruf > 0 && (
        <span className="absolute -top-2.5 right-3 rounded-full bg-primary px-2 py-0.5 text-[0.6875rem] font-medium text-primary-foreground">
          2 ay ücretsiz
        </span>
      )}

      <p className="text-sm font-medium">{plan.label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">
        {formatMoney(plan.price)}
        <span className="text-sm font-normal text-muted-foreground">
          {" / "}
          {plan.period}
        </span>
      </p>
      <p className="mt-1 flex-1 text-xs text-muted-foreground">
        {yillik
          ? `Ayda ${formatMoney(yearlyMonthlyEquivalent())} — ${formatMoney(tasarruf)} tasarruf`
          : "Aylık ödeme, istediğiniz zaman bırakabilirsiniz"}
      </p>

      {href && (
        <Button
          asChild
          variant={yillik ? "default" : "outline"}
          size="sm"
          className="mt-4 w-full self-end"
        >
          <a href={href} target="_blank" rel="noopener noreferrer">
            {plan.label} planı istiyorum
          </a>
        </Button>
      )}
    </div>
  );
}
