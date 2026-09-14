import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { canSeeFinance, requireSession } from "@/lib/auth";
import { vertical } from "@/lib/vertical";
import { createClient } from "@/lib/supabase/server";
import { parseDateRange } from "@/lib/date-range";
import { ORGANIZATION_TYPE_LABELS, WEEKDAY_LABELS } from "@/lib/constants";
import { formatMoney, formatNumber, formatPercent } from "@/lib/format";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import {
  MonthlyPerformanceChart,
  TypeDistributionChart,
  VenueComparisonChart,
  WeekdayChart,
} from "@/components/charts/report-charts";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { StatCard } from "@/components/shared/stat-card";
import type {
  FinanceSummary,
  MonthlySeriesRow,
  PackageBreakdownRow,
  TypeBreakdownRow,
  VenuePerformanceRow,
  WeekdayBreakdownRow,
} from "@/lib/database.types";

export const metadata: Metadata = { title: "Raporlar" };

export default async function ReportsPage({ searchParams }: PageProps<"/raporlar">) {
  const { profile, business } = await requireSession();
  const sozluk = vertical(business.business_type);
  const kucuk = sozluk.resource.singular.toLocaleLowerCase("tr-TR");

  if (!canSeeFinance(profile)) notFound();

  const params = await searchParams;
  const { from, to, preset } = parseDateRange(params, "bu-yil");

  const supabase = await createClient();
  const range = { p_from: from, p_to: to };

  const [summary, series, venues, types, packages, weekdays] = await Promise.all([
    supabase.rpc("finance_summary", range),
    supabase.rpc("monthly_series", range),
    supabase.rpc("venue_performance", range),
    supabase.rpc("type_breakdown", range),
    supabase.rpc("package_breakdown", range),
    supabase.rpc("weekday_breakdown", range),
  ]);

  // Altı RPC'den biri bile hata verirse sıfır göstermek yanıltıcı olur.
  const rpcHatasi = [summary, series, venues, types, packages, weekdays]
    .map((r) => (r as { error?: { message: string } | null }).error?.message)
    .find(Boolean);

  if (rpcHatasi) {
    return (
      <>
        <PageHeader title="Raporlar" />
        <PageBody>
          <ErrorState message={rpcHatasi} />
        </PageBody>
      </>
    );
  }

  const s = (summary.data as FinanceSummary[] | null)?.[0] ?? null;
  // Gider yoksa kâr ve marj anlamsız — satışın tamamı kâr gibi görünür.
  const giderYok = Number(s?.total_expenses ?? 0) === 0;
  const monthly = (series.data as MonthlySeriesRow[] | null) ?? [];
  const venueRows = ((venues.data as VenuePerformanceRow[] | null) ?? []).filter(
    (v) => Number(v.reservation_count) > 0,
  );
  const typeRows = (types.data as TypeBreakdownRow[] | null) ?? [];
  const packageRows = (packages.data as PackageBreakdownRow[] | null) ?? [];
  const weekdayRows = (weekdays.data as WeekdayBreakdownRow[] | null) ?? [];

  const hasData = Number(s?.reservation_count ?? 0) > 0;

  // Tahsilat çubuğu için oran. Satış sıfırken bölme yapılmıyor.
  const toplamSatis = Number(s?.total_sales ?? 0);
  const tahsilOrani =
    toplamSatis > 0
      ? Math.min(100, Math.round((Number(s?.collected_in_range ?? 0) / toplamSatis) * 100))
      : 0;

  const topType = typeRows[0];
  const topPackage = packageRows[0];
  const topVenue = venueRows[0];
  const topWeekday = [...weekdayRows].sort(
    (a, b) => Number(b.reservation_count) - Number(a.reservation_count),
  )[0];

  return (
    <>
      <PageHeader
        title="Raporlar"
        description="Seçtiğiniz dönemin satış, tahsilat ve kârlılık özeti"
        actions={<DateRangeFilter range={{ from, to }} preset={preset} />}
      />

      <PageBody>
        {/*
          Üç blok, on iki kart değil. Eskiden hepsi aynı ağırlıktaydı ve
          hiçbiri "önce buna bak" demiyordu; birbiriyle ilgili rakamlar ayrı
          kutulara dağılmıştı. Satış/tahsilat/bekleyen tek hikâye, kâr/marj/
          gider tek hikâye.
        */}
        <div className="grid gap-4 lg:grid-cols-3">
          <StatCard label="Toplam satış" value={formatMoney(s?.total_sales)}>
            {/* Tahsilat oranı artık gözle okunuyor; önce kullanıcı iki ayrı
                karta bakıp kafadan hesaplıyordu. */}
            <div className="mt-4 space-y-2">
              <div
                className="h-1.5 overflow-hidden rounded-full bg-muted"
                role="presentation"
              >
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${tahsilOrani}%` }}
                />
              </div>
              <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs">
                <span className="text-emerald-700 dark:text-emerald-400">
                  {formatMoney(s?.collected_in_range)} tahsil
                </span>
                <span className="text-muted-foreground">
                  {formatMoney(s?.outstanding)} bekliyor
                </span>
              </div>
            </div>
          </StatCard>

          {/* Dönemde hiç gider girilmemişse kâr = satış ve marj %100 çıkar.
              Bu bir sonuç değil, eksik veri; rakam yerine durumu yazıyoruz. */}
          <StatCard
            label="Kâr"
            value={giderYok ? "—" : formatMoney(s?.profit)}
            hint={
              giderYok
                ? "Bu dönemde gider girilmedi"
                : `${formatPercent(s?.profit_margin)} marj · ${formatMoney(s?.total_expenses)} gider`
            }
            tone={!giderYok && Number(s?.profit ?? 0) < 0 ? "negative" : "default"}
          />

          <StatCard
            label="Organizasyon"
            value={formatNumber(s?.reservation_count)}
            hint={
              s?.avg_sale
                ? `Organizasyon başına ortalama ${formatMoney(s.avg_sale)}`
                : undefined
            }
          />
        </div>

        {!hasData ? (
          <EmptyState
            icon={BarChart3}
            title="Bu dönemde veri yok"
            description="Seçtiğiniz tarih aralığında organizasyon bulunmuyor. Farklı bir dönem seçmeyi deneyin."
          />
        ) : (
          <>
            {/*
              Bunlar metrik değil, kategorik öne çıkanlar. Para rakamlarıyla
              aynı kutuda durunca hem yer kaplıyor hem yanlış bir eşitlik
              kuruyordu. Kart değil, tek satırlık şerit.
            */}
            <div className="grid gap-x-6 gap-y-4 rounded-xl border bg-card px-5 py-4 sm:grid-cols-2 xl:grid-cols-4">
              <Highlight
                label="En çok tercih edilen tür"
                value={
                  topType ? ORGANIZATION_TYPE_LABELS[topType.organization_type] : "—"
                }
                hint={topType ? `${topType.reservation_count} organizasyon` : undefined}
              />
              <Highlight
                label="En çok satılan paket"
                value={topPackage?.package_name ?? "—"}
                hint={
                  topPackage
                    ? `${topPackage.reservation_count} organizasyon`
                    : "Paket kullanılmamış"
                }
              />
              <Highlight
                label={`En yoğun ${kucuk}`}
                value={topVenue?.venue_name ?? "—"}
                hint={topVenue ? `${formatMoney(topVenue.sales)} satış` : undefined}
              />
              <Highlight
                label="En yoğun gün"
                value={topWeekday ? WEEKDAY_LABELS[topWeekday.weekday] : "—"}
                hint={
                  topWeekday ? `${topWeekday.reservation_count} organizasyon` : undefined
                }
              />
            </div>

            <section className="rounded-xl border bg-card p-5">
              <header className="mb-4">
                <h2 className="font-medium">Aylık gelir-gider</h2>
                <p className="text-xs text-muted-foreground">
                  Satış organizasyon tarihine, tahsilat ve gider işlem tarihine göredir.
                </p>
              </header>
              <MonthlyPerformanceChart data={monthly} />
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-xl border bg-card p-5">
                <header className="mb-4">
                  <h2 className="font-medium">Salon performansı</h2>
                  <p className="text-xs text-muted-foreground">
                    Salon bazında satış ve kâr karşılaştırması
                  </p>
                </header>
                {venueRows.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Bu dönemde salon verisi yok.
                  </p>
                ) : (
                  <VenueComparisonChart data={venueRows} />
                )}
              </section>

              <section className="rounded-xl border bg-card p-5">
                <header className="mb-4">
                  <h2 className="font-medium">Organizasyon türleri</h2>
                  <p className="text-xs text-muted-foreground">
                    Hangi tür organizasyonları daha çok yapıyorsunuz?
                  </p>
                </header>
                <TypeDistributionChart data={typeRows} />
              </section>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-xl border bg-card p-5">
                <header className="mb-4">
                  <h2 className="font-medium">En yoğun günler</h2>
                  <p className="text-xs text-muted-foreground">
                    Haftanın günlerine göre organizasyon sayısı
                  </p>
                </header>
                <WeekdayChart data={weekdayRows} />
              </section>

              <section className="rounded-xl border bg-card">
                <header className="border-b px-5 py-4">
                  <h2 className="font-medium">Salon detayları</h2>
                </header>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs tracking-wide text-muted-foreground uppercase">
                        <th className="px-5 py-2.5 text-left font-medium">Salon</th>
                        <th className="px-5 py-2.5 text-right font-medium">Adet</th>
                        <th className="px-5 py-2.5 text-right font-medium">Satış</th>
                        <th className="px-5 py-2.5 text-right font-medium">Kâr</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {venueRows.map((venue) => (
                        <tr key={venue.venue_id}>
                          <td className="px-5 py-3 font-medium">{venue.venue_name}</td>
                          <td className="tabular px-5 py-3 text-right">
                            {formatNumber(venue.reservation_count)}
                          </td>
                          <td className="tabular px-5 py-3 text-right">
                            {formatMoney(venue.sales)}
                          </td>
                          <td className="tabular px-5 py-3 text-right">
                            {formatMoney(venue.profit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </>
        )}
      </PageBody>
    </>
  );
}

function Highlight({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  // Kendi kenarlığı yok: dördü birden tek bir şeridin içinde duruyor.
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-semibold tracking-tight">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
