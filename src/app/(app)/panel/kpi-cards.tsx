import { TrendingDown, TrendingUp } from "lucide-react";
import { buyukHarf, type Vertical } from "@/lib/vertical";
import { formatMoney, formatNumber } from "@/lib/format";
import type { FinanceSummary } from "@/lib/database.types";
import type { Trend } from "@/lib/trend";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Bu ayın dört ana göstergesi ve altında gider / net nakit / kâr özeti.
 *
 * Mobilde iki sütun: yedi kart alt alta dizildiğinde iki ekran boyu
 * tutuyordu. Kıyas rozeti her kartta aynı yerde; "geçen aya göre" açıklaması
 * yalnızca geniş ekranda yazılıyor.
 */
export function KpiCards({
  summary,
  trends,
  sozluk,
}: {
  summary: FinanceSummary;
  trends: { org: Trend | null; satis: Trend | null; tahsil: Trend | null };
  sozluk: Vertical;
}) {
  return (
    <div className="grid gap-3 sm:gap-4">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Kpi
          index={0}
          label={buyukHarf(sozluk.event.singular)}
          value={formatNumber(summary.reservation_count)}
          trend={trends.org}
          hint={summary.avg_sale ? `Ortalama ${formatMoney(summary.avg_sale)}` : undefined}
        />
        <Kpi
          index={1}
          label="Satış"
          value={formatMoney(summary.total_sales)}
          trend={trends.satis}
          hint={`${buyukHarf(sozluk.event.singular)} tarihine göre`}
        />
        <Kpi
          index={2}
          label="Tahsil edilen"
          value={formatMoney(summary.collected_in_range)}
          trend={trends.tahsil}
          hint="Kasaya giren"
        />
        <Kpi
          index={3}
          label="Bekleyen tahsilat"
          value={formatMoney(summary.outstanding)}
          valueClassName={Number(summary.outstanding) > 0 ? "text-warning" : undefined}
          hint={`Bu ayki ${sozluk.event.ablativePlural}`}
        />
      </div>

      <Card
        className="animate-in gap-0 py-0 shadow-xs duration-500 fill-mode-both fade-in-0 slide-in-from-bottom-2 motion-reduce:animate-none"
        style={{ animationDelay: "240ms" }}
      >
        <dl className="grid grid-cols-3 divide-x">
          <Cell label="Gider" value={summary.total_expenses} negative />
          <Cell label="Net nakit" value={summary.net_cash} hint="Tahsilat − gider" />
          <Cell label="Kâr" value={summary.profit} hint="Satış − gider" />
        </dl>
      </Card>
    </div>
  );
}

function Kpi({
  index,
  label,
  value,
  valueClassName,
  trend,
  hint,
}: {
  index: number;
  label: string;
  value: string;
  valueClassName?: string;
  trend?: Trend | null;
  hint?: string;
}) {
  return (
    <Card
      className="@container/card animate-in gap-2 [--card-spacing:--spacing(3)] sm:gap-3 sm:[--card-spacing:--spacing(4)] shadow-xs duration-500 fill-mode-both fade-in-0 slide-in-from-bottom-2 motion-reduce:animate-none"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <CardHeader>
        <CardDescription className="truncate text-xs sm:text-sm">{label}</CardDescription>
        <CardTitle
          className={cn(
            "tabular text-lg font-semibold tracking-tight @[240px]/card:text-2xl",
            valueClassName,
          )}
        >
          {value}
        </CardTitle>
      </CardHeader>
      {(trend || hint) && (
        <CardContent className="flex min-h-5 items-center gap-2 text-xs text-muted-foreground">
          {trend ? (
            <>
              <TrendBadge trend={trend} />
              <span className="hidden truncate @[240px]/card:inline">geçen aya göre</span>
            </>
          ) : (
            <span className="truncate">{hint}</span>
          )}
        </CardContent>
      )}
    </Card>
  );
}

/**
 * Yön hem ikonla hem renkle hem de ekran okuyucu metniyle veriliyor; renk
 * tek başına bırakılsaydı renk körü kullanıcı için ayırt edilemezdi.
 */
function TrendBadge({ trend }: { trend: Trend }) {
  if (trend.direction === "flat") {
    return <Badge variant="outline">Değişim yok</Badge>;
  }
  const artis = trend.direction === "up";
  const Icon = artis ? TrendingUp : TrendingDown;
  return (
    <Badge
      variant="outline"
      className={cn("tabular", artis ? "text-success" : "text-destructive")}
      title={trend.label}
    >
      <Icon aria-hidden />
      %{trend.percent}
      <span className="sr-only">{artis ? "artış" : "azalış"}</span>
    </Badge>
  );
}

function Cell({
  label,
  value,
  hint,
  negative,
}: {
  label: string;
  value: number;
  hint?: string;
  negative?: boolean;
}) {
  const n = Number(value);
  return (
    <div className="min-w-0 px-3 py-3 sm:px-5 sm:py-4">
      <dt className="truncate text-xs text-muted-foreground sm:text-sm">{label}</dt>
      <dd
        className={cn(
          "tabular mt-1 truncate text-sm font-semibold sm:text-lg",
          (negative || n < 0) && "text-destructive",
        )}
      >
        {formatMoney(value)}
      </dd>
      {hint && (
        <dd className="mt-0.5 hidden truncate text-xs text-muted-foreground sm:block">
          {hint}
        </dd>
      )}
    </div>
  );
}
