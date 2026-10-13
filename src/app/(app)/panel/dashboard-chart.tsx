"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMoney, formatMoneyCompact, sumMoney } from "@/lib/format";
import type { MonthlySeriesRow } from "@/lib/database.types";

const config = {
  collected: { label: "Tahsilat", color: "var(--chart-2)" },
  expenses: { label: "Gider", color: "var(--chart-3)" },
  sales: { label: "Satış", color: "var(--chart-1)" },
} satisfies ChartConfig;

type Mode = "nakit" | "satis";

/**
 * Son altı ay, iki ayrı görünüm: nakit akışı (tahsilat ve gider, işlem
 * tarihine göre) ve satış (organizasyon tarihine göre). Aynı grafikte
 * üst üste çizilmiyorlar — kârlılık ile kasa ayrı kavramlar.
 */
export function DashboardChart({
  data,
  eventLabel,
}: {
  data: MonthlySeriesRow[];
  eventLabel: string;
}) {
  const [mode, setMode] = useState<Mode>("nakit");

  const chartData = data.map((row) => ({
    month: format(parseISO(row.month), "LLL", { locale: tr }),
    collected: Number(row.collected),
    expenses: Number(row.expenses),
    sales: Number(row.sales),
  }));
  const keys = mode === "nakit" ? (["collected", "expenses"] as const) : (["sales"] as const);

  const description =
    mode === "nakit"
      ? `Tahsilat ${formatMoney(sumMoney(data.map((r) => r.collected)))} · Gider ${formatMoney(sumMoney(data.map((r) => r.expenses)))}`
      : `Toplam ${formatMoney(sumMoney(data.map((r) => r.sales)))} · ${eventLabel} tarihine göre`;

  return (
    <Card className="gap-2 shadow-xs">
      <CardHeader>
        <CardTitle>Son 6 ay</CardTitle>
        <CardDescription className="tabular text-xs sm:text-sm">
          {description}
        </CardDescription>
        <CardAction>
          <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <TabsList>
              <TabsTrigger value="nakit">Nakit</TabsTrigger>
              <TabsTrigger value="satis">Satış</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 sm:px-4">
        <ChartContainer config={config} className="aspect-auto h-48 w-full sm:h-64">
          <AreaChart data={chartData} margin={{ left: 0, right: 8, top: 8 }}>
            <defs>
              {keys.map((key) => (
                <linearGradient key={key} id={`fill-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={`var(--color-${key})`} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={`var(--color-${key})`} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} />
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
              width={52}
              tickFormatter={(value: number) => formatMoneyCompact(value)}
              className="text-xs"
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  formatter={(value, name) => (
                    <span className="flex w-full items-center justify-between gap-4">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: `var(--color-${name})` }}
                        />
                        {config[name as keyof typeof config]?.label ?? name}
                      </span>
                      <span className="tabular font-medium">{formatMoney(Number(value))}</span>
                    </span>
                  )}
                />
              }
            />
            {keys.map((key) => (
              <Area
                key={`${mode}-${key}`}
                dataKey={key}
                type="monotone"
                fill={`url(#fill-${key})`}
                stroke={`var(--color-${key})`}
                strokeWidth={2}
                animationDuration={700}
              />
            ))}
          </AreaChart>
        </ChartContainer>
        {mode === "nakit" && (
          <div className="flex justify-center gap-4 pt-1 text-xs text-muted-foreground">
            {keys.map((key) => (
              <span key={key} className="inline-flex items-center gap-1.5">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: config[key].color }}
                />
                {config[key].label}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
