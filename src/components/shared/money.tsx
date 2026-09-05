import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Para gösterimi. `tone` finansal anlamı renkle destekler:
 * pozitif = tahsilat/kâr, negatif = gider/zarar, pending = bekleyen tahsilat.
 */
export function Money({
  value,
  tone = "default",
  className,
}: {
  value: number | string | null | undefined;
  tone?: "default" | "positive" | "negative" | "pending" | "muted";
  className?: string;
}) {
  const tones = {
    default: "",
    positive: "text-success",
    negative: "text-destructive",
    pending: "text-warning",
    muted: "text-muted-foreground",
  } as const;

  return (
    <span className={cn("tabular whitespace-nowrap", tones[tone], className)}>
      {formatMoney(value)}
    </span>
  );
}
