import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import {
  BILLING_TERMS,
  MONTHLY_PRICE,
  subscriptionWhatsAppLink,
  type BillingTerm,
  type SubscriptionState,
} from "@/lib/subscription";
import { cn } from "@/lib/utils";

/**
 * Abonelik dönemleri.
 *
 * Özellik listesi yok: tek paket satılıyor, iki kartta da aynı şeyler
 * yazacaktı. Kartların söylediği tek fark dönem ve bedel.
 *
 * Seçim sunucuya kaydedilmiyor — ödeme havale ile alınıp elle onaylandığı için
 * seçilen dönem ile ödenen tutarın aynı olma garantisi yok. Kartın tek işlevi
 * WhatsApp mesajına dönemi yazmak; bu yüzden durum tutmuyor ve istemci
 * bileşeni değil.
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
  return (
    <div>
      <h2 className="text-sm font-semibold">Abonelik bedeli</h2>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {BILLING_TERMS.map((term) => (
          <TermCard
            key={term.id}
            term={term}
            href={subscriptionWhatsAppLink({
              state,
              businessName,
              referenceCode,
              email,
              term,
            })}
          />
        ))}
      </div>
    </div>
  );
}

function TermCard({ term, href }: { term: BillingTerm; href: string | null }) {
  const bedavaAy = term.months - term.paidMonths;

  return (
    // flex + mt-auto: dökümler farklı uzunlukta, düğmeler aksi halde farklı
    // yükseklikte duruyordu.
    <div
      className={cn(
        "relative flex h-full flex-col rounded-lg p-4",
        term.featured ? "border-2 border-primary" : "border",
      )}
    >
      {bedavaAy > 0 && (
        <span className="absolute -top-2.5 right-3 rounded-full bg-primary px-2 py-0.5 text-[0.6875rem] font-medium text-primary-foreground">
          {bedavaAy} ay ücretsiz
        </span>
      )}

      <p className="text-sm font-medium">{term.label}</p>

      <p className="mt-1 text-2xl font-semibold tracking-tight">
        {formatMoney(term.price)}
      </p>

      {/* Döküm açıkça yazılıyor: "1 ay ücretsiz" ifadesinin rakamla tuttuğu
          görülebilsin. */}
      <p className="mt-1 flex-1 text-xs text-muted-foreground">
        {term.days} gün ·{" "}
        {bedavaAy > 0
          ? `${term.paidMonths} ay ödersiniz, ${formatMoney(MONTHLY_PRICE * bedavaAy)} tasarruf`
          : `ayda ${formatMoney(MONTHLY_PRICE)}`}
      </p>

      {href && (
        <Button
          asChild
          variant={term.featured ? "default" : "outline"}
          size="sm"
          className="mt-4 w-full"
        >
          <a href={href} target="_blank" rel="noopener noreferrer">
            {term.label} istiyorum
          </a>
        </Button>
      )}
    </div>
  );
}
