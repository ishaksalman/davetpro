import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TONES = {
  default: "text-foreground",
  positive: "text-success",
  negative: "text-destructive",
  pending: "text-warning",
  primary: "text-primary",
} as const;

/**
 * Dashboard ve rapor ekranlarının temel yapı taşı.
 * Değer büyük ve tabular; ikincil bilgi (hint) altında küçük punto.
 */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  className,
  children,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  tone?: keyof typeof TONES;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-xl border bg-card p-5", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" />}
      </div>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold tracking-tight tabular",
          TONES[tone],
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}
