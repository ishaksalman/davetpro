"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatMoney, formatMoneyCompact } from "@/lib/format";
import type { MonthlySeriesRow } from "@/lib/database.types";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

const config = {
  collected: { label: "Tahsilat", color: "var(--chart-2)" },
  expenses: { label: "Gider", color: "var(--chart-3)" },
} satisfies ChartConfig;

/**
 * Aylık nakit akışı: tahsil edilen ile ödenen gider yan yana.
 * Bilinçli olarak "satış" değil "tahsilat" gösterilir — bu grafik kasadaki
 * parayı anlatır, muhasebesel satışı değil.
 */
export function CashflowChart({ data }: { data: MonthlySeriesRow[] }) {
  const chartData = data.map((row) => ({
    month: format(parseISO(row.month), "LLL", { locale: tr }),
    collected: Number(row.collected),
    expenses: Number(row.expenses),
  }));

  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full">
      <BarChart data={chartData} margin={{ left: 4, right: 4, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          className="text-xs"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={(value: number) => formatMoneyCompact(value)}
          className="text-xs"
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) => (
                <span className="flex w-full justify-between gap-4">
                  <span className="text-muted-foreground">
                    {config[name as keyof typeof config]?.label ?? name}
                  </span>
                  <span className="tabular font-medium">
                    {formatMoney(Number(value))}
                  </span>
                </span>
              )}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="collected" fill="var(--color-collected)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
