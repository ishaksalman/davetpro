"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ORGANIZATION_TYPE_LABELS, WEEKDAY_LABELS } from "@/lib/constants";
import { formatMoneyCompact } from "@/lib/format";
import type {
  MonthlySeriesRow,
  TypeBreakdownRow,
  VenuePerformanceRow,
  WeekdayBreakdownRow,
} from "@/lib/database.types";

// --- Aylık satış / tahsilat / gider --------------------------------------

const monthlyConfig = {
  sales: { label: "Satış", color: "var(--chart-1)" },
  collected: { label: "Tahsilat", color: "var(--chart-2)" },
  expenses: { label: "Gider", color: "var(--chart-3)" },
} satisfies ChartConfig;

export function MonthlyPerformanceChart({ data }: { data: MonthlySeriesRow[] }) {
  const chartData = data.map((row) => ({
    month: format(parseISO(row.month), "LLL yy", { locale: tr }),
    sales: Number(row.sales),
    collected: Number(row.collected),
    expenses: Number(row.expenses),
  }));

  return (
    <ChartContainer config={monthlyConfig} className="aspect-auto h-72 w-full">
      <LineChart data={chartData} margin={{ left: 4, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={60}
          tickFormatter={(v: number) => formatMoneyCompact(v)}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Line
          dataKey="sales"
          stroke="var(--color-sales)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          dataKey="collected"
          stroke="var(--color-collected)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          dataKey="expenses"
          stroke="var(--color-expenses)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ChartContainer>
  );
}

// --- Salon performansı ----------------------------------------------------

const venueConfig = {
  sales: { label: "Satış", color: "var(--chart-1)" },
  profit: { label: "Kâr", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function VenueComparisonChart({ data }: { data: VenuePerformanceRow[] }) {
  const chartData = data.map((row) => ({
    venue: row.venue_name,
    sales: Number(row.sales),
    profit: Number(row.profit),
  }));

  return (
    <ChartContainer config={venueConfig} className="aspect-auto h-64 w-full">
      <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => formatMoneyCompact(v)}
        />
        <YAxis
          type="category"
          dataKey="venue"
          tickLine={false}
          axisLine={false}
          width={110}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="sales" fill="var(--color-sales)" radius={[0, 4, 4, 0]} />
        <Bar dataKey="profit" fill="var(--color-profit)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

// --- Organizasyon türü dağılımı -------------------------------------------

const PIE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function TypeDistributionChart({ data }: { data: TypeBreakdownRow[] }) {
  const chartData = data.map((row, index) => ({
    name: ORGANIZATION_TYPE_LABELS[row.organization_type],
    value: Number(row.reservation_count),
    fill: PIE_COLORS[index % PIE_COLORS.length],
  }));

  const config = Object.fromEntries(
    chartData.map((d, i) => [d.name, { label: d.name, color: PIE_COLORS[i % PIE_COLORS.length] }]),
  ) satisfies ChartConfig;

  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full">
      <PieChart>
        <ChartTooltip
          content={
            <ChartTooltipContent
              nameKey="name"
              formatter={(value, name) => (
                <span className="flex w-full justify-between gap-4">
                  <span className="text-muted-foreground">{name}</span>
                  <span className="tabular font-medium">{Number(value)} adet</span>
                </span>
              )}
            />
          }
        />
        <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={52} strokeWidth={2}>
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey="name" />} />
      </PieChart>
    </ChartContainer>
  );
}

// --- En yoğun günler ------------------------------------------------------

const weekdayConfig = {
  count: { label: "Organizasyon", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function WeekdayChart({ data }: { data: WeekdayBreakdownRow[] }) {
  const counts = new Map(data.map((d) => [d.weekday, Number(d.reservation_count)]));
  // Hafta Pazartesi'den başlasın (Türkiye kullanımı).
  const order = [1, 2, 3, 4, 5, 6, 0];
  const chartData = order.map((dow) => ({
    day: WEEKDAY_LABELS[dow].slice(0, 3),
    count: counts.get(dow) ?? 0,
  }));

  return (
    <ChartContainer config={weekdayConfig} className="aspect-auto h-56 w-full">
      <BarChart data={chartData} margin={{ left: 4, right: 4, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
