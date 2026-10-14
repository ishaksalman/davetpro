import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
} from "lucide-react";
import {
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { tr } from "date-fns/locale";
import { canSeeFinance, requireSession } from "@/lib/auth";
import { vertical, buyukHarf } from "@/lib/vertical";
import { createClient } from "@/lib/supabase/server";
import { getLookups, getReservationRows } from "@/lib/queries";
import { today as businessToday, todayISO } from "@/lib/time";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";
import {
  formatDate,
  formatDateShort,
  formatMoney,
  toISODate,
} from "@/lib/format";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Money } from "@/components/shared/money";
import { StageBadge } from "@/components/shared/stage-badge";
import { WhatsAppButton } from "@/components/shared/whatsapp-button";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  Expense,
  FinanceSummary,
  MonthlySeriesRow,
  Payment,
} from "@/lib/database.types";
import { monthOverMonth } from "@/lib/trend";
import { cn } from "@/lib/utils";
import { DashboardChart } from "./dashboard-chart";
import { KpiCards } from "./kpi-cards";
import { MiniCalendar, type CalendarItem } from "./mini-calendar";
import { WeekStrip } from "./week-strip";
import { ReservationFormDialog } from "../rezervasyonlar/reservation-form-dialog";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { profile, business } = await requireSession();
  const sozluk = vertical(business.business_type);

  const showFinance = canSeeFinance(profile);

  // Sunucunun değil işletmenin saatine göre "bugün".
  const now = businessToday();
  const today = todayISO();
  const monthStart = toISODate(startOfMonth(now));
  const weekStartDate = startOfWeek(now, { weekStartsOn: 1 });
  const weekStart = toISODate(weekStartDate);
  const weekEnd = toISODate(endOfWeek(now, { weekStartsOn: 1 }));
  // Hafta önceki aydan başlayabiliyor; mini takvim ise ay başından istiyor.
  const reservationsFrom = weekStart < monthStart ? weekStart : monthStart;
  const monthEnd = toISODate(endOfMonth(now));
  const seriesStart = toISODate(startOfMonth(subMonths(now, 5)));
  // Kartlardaki "geçen aya göre" kıyası için.
  const prevMonth = subMonths(now, 1);
  const prevStart = toISODate(startOfMonth(prevMonth));
  const prevEnd = toISODate(endOfMonth(prevMonth));

  const supabase = await createClient();

  const [
    lookups,
    reservationsResult,
    summaryResult,
    seriesResult,
    prevSummaryResult,
    recentPayments,
    recentExpenses,
  ] = await Promise.all([
    getLookups(),
    getReservationRows({ from: reservationsFrom }),
    showFinance
      ? supabase.rpc("finance_summary", { p_from: monthStart, p_to: monthEnd })
      : Promise.resolve({ data: null }),
    showFinance
      ? supabase.rpc("monthly_series", { p_from: seriesStart, p_to: monthEnd })
      : Promise.resolve({ data: null }),
    showFinance
      ? supabase.rpc("finance_summary", { p_from: prevStart, p_to: prevEnd })
      : Promise.resolve({ data: null }),
    showFinance
      ? supabase
          .from("payments")
          .select("*")
          .is("voided_at", null)
          .order("created_at", { ascending: false })
          .limit(5)
          .returns<Payment[]>()
      : Promise.resolve({ data: null }),
    showFinance
      ? supabase
          .from("expenses")
          .select("*")
          .is("voided_at", null)
          .order("created_at", { ascending: false })
          .limit(5)
          .returns<Expense[]>()
      : Promise.resolve({ data: null }),
  ]);

  // Finansal veri okunamadıysa ₺0 göstermek yerine hatayı bildir.
  const hata =
    reservationsResult.error ??
    (summaryResult as { error?: { message: string } | null }).error?.message ??
    (seriesResult as { error?: { message: string } | null }).error?.message ??
    null;

  if (hata) {
    return (
      <>
        <PageHeader title={business.name} />
        <PageBody>
          <ErrorState message={hata} />
        </PageBody>
      </>
    );
  }

  // Ayın başından geliyor: mini takvim geçmiş günleri de işaretliyor.
  const active = reservationsResult.rows.filter(
    (r) => r.status !== "iptal_edildi",
  );
  const upcoming = active.filter((r) => r.event_date >= today);
  const weekEvents = active.filter(
    (r) => r.event_date >= weekStart && r.event_date <= weekEnd,
  );
  const todayCount = upcoming.filter((r) => r.event_date === today).length;
  const nextEvents = upcoming.filter((r) => r.event_date > today).slice(0, 5);

  // Satırlar tarih ve saate göre sıralı geliyor; gün içi sıra korunuyor.
  const calendarDays: Record<string, CalendarItem[]> = {};
  for (const r of active) {
    (calendarDays[r.event_date] ??= []).push({
      id: r.id,
      title: r.customer?.full_name ?? "—",
      time: r.start_time.slice(0, 5),
      color: r.venue?.color ?? "var(--muted-foreground)",
    });
  }

  const summary = (summaryResult.data as FinanceSummary[] | null)?.[0] ?? null;
  const prevSummary =
    (prevSummaryResult.data as FinanceSummary[] | null)?.[0] ?? null;

  /*
   * Kart altlarındaki kıyas. Geçen ay hiç kayıt yoksa null dönüyor ve
   * kartlar eski açıklayıcı metinlerine düşüyor — "%100 artış" demek
   * sıfırdan çıkışta anlamsız olurdu.
   */
  const orgTrend = monthOverMonth(
    summary?.reservation_count,
    prevSummary?.reservation_count,
  );
  const satisTrend = monthOverMonth(
    summary?.total_sales,
    prevSummary?.total_sales,
  );
  const tahsilTrend = monthOverMonth(
    summary?.collected_in_range,
    prevSummary?.collected_in_range,
  );
  const series = (seriesResult.data as MonthlySeriesRow[] | null) ?? [];

  // Yaklaşan ödemeler: ödeme tarihi girilmiş ve bakiyesi kalan organizasyonlar.
  const duePayments = upcoming
    .filter((r) => r.balance_amount > 0 && r.due_date)
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))
    .slice(0, 5);

  const customerNames = new Map(
    lookups.customers.map((c) => [c.id, c.full_name] as const),
  );
  const transactions = buildTransactions(
    recentPayments.data ?? [],
    recentExpenses.data ?? [],
    customerNames,
  );

  const hasVenue = lookups.venues.some((v) => v.is_active);

  return (
    <>
      <PageHeader
        title={`Tekrar hoş geldin, ${firstName(profile.full_name)} 👋`}
        description={greetingSummary({
          todayCount,
          weekCount: weekEvents.length,
          overdue: showFinance
            ? upcoming.filter(
                (r) => r.balance_amount > 0 && r.due_date && r.due_date < today,
              ).length
            : 0,
          eventLabel: sozluk.event.singular,
        })}
        actions={
          hasVenue && (
            <ReservationFormDialog
              customers={lookups.customers}
              venues={lookups.venues}
              teams={lookups.teams}
              packages={lookups.packages}
              showFinance={showFinance}
              triggerButton={{
                label: "Yeni rezervasyon",
                icon: "plus",
                labelHiddenOnMobile: true,
              }}
            />
          )
        }
      />

      <PageBody>
        {!hasVenue && (
          <EmptyState
            icon={CalendarDays}
            title="Kuruluma birkaç adım kaldı"
            description={`${sozluk.resource.plural} bölümünü doldurun, ardından paketlerinizi ekleyin. Sonrasında rezervasyon almaya başlayabilirsiniz.`}
            action={
              <Button asChild>
                <Link href="/salonlar">{sozluk.resourceNew}</Link>
              </Button>
            }
          />
        )}

        <WeekStrip weekStart={weekStartDate} today={today} events={weekEvents} />

        {showFinance && summary && (
          <KpiCards
            summary={summary}
            trends={{ org: orgTrend, satis: satisTrend, tahsil: tahsilTrend }}
            sozluk={sozluk}
          />
        )}

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_22rem]">
          <div className="min-w-0 space-y-4 sm:space-y-6">
            {showFinance && series.length > 0 && (
              <DashboardChart
                data={series}
                eventLabel={buyukHarf(sozluk.event.singular)}
              />
            )}

            {showFinance && (
              <Panel title="Son işlemler">
                {transactions.length === 0 ? (
                  <Empty text="Henüz finansal işlem kaydı yok." />
                ) : (
                  <ul className="divide-y">
                    {transactions.map((t) => (
                      <li
                        key={`${t.kind}-${t.id}`}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        <span
                          className={cn(
                            "grid size-8 shrink-0 place-items-center rounded-lg",
                            t.kind === "payment"
                              ? "bg-success/10 text-success"
                              : "bg-destructive/10 text-destructive",
                          )}
                        >
                          {t.kind === "payment" ? (
                            <ArrowDownLeft className="size-4" />
                          ) : (
                            <ArrowUpRight className="size-4" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {t.title}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {formatDateShort(t.date)} · {t.subtitle}
                          </p>
                        </div>
                        <Money
                          value={t.amount}
                          tone={t.kind === "payment" ? "positive" : "negative"}
                          className="text-sm"
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            )}
          </div>

          <aside className="space-y-4 sm:space-y-6">
            <MiniCalendar today={today} days={calendarDays} />

            <Panel
              title={`Yaklaşan ${sozluk.event.plural}`}
              action={
                <Button asChild variant="ghost" size="sm">
                  <Link href="/takvim">
                    Takvim
                    <ArrowRight />
                  </Link>
                </Button>
              }
            >
              {nextEvents.length === 0 ? (
                <Empty text={`Planlanmış ${sozluk.event.singular} yok.`} />
              ) : (
                <ul className="divide-y">
                  {nextEvents.map((r) => (
                    <EventRow key={r.id} reservation={r} />
                  ))}
                </ul>
              )}
            </Panel>

            {showFinance && (
              <Panel title="Yaklaşan ödemeler">
                {duePayments.length === 0 ? (
                  <Empty text="Tarihi belirlenmiş bekleyen ödeme yok." />
                ) : (
                  <ul className="divide-y">
                    {duePayments.map((r) => (
                      <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/rezervasyonlar/${r.id}`}
                            className="block truncate text-sm font-medium hover:underline"
                          >
                            {r.customer?.full_name ?? "—"}
                          </Link>
                          <DueLabel due={r.due_date!} today={now} />
                        </div>
                        <Money
                          value={r.balance_amount}
                          tone="pending"
                          className="text-sm"
                        />
                        <WhatsAppButton
                          phone={r.customer?.phone}
                          message={`Merhaba ${r.customer?.full_name ?? ""}, ${formatDate(r.event_date)} tarihli ${sozluk.event.possessive} için kalan ödemeniz ${formatMoney(r.balance_amount)}.`}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            )}
          </aside>
        </div>
      </PageBody>
    </>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-0 py-0 shadow-xs">
      <CardHeader className="border-b py-3">
        <CardTitle className="leading-8">{title}</CardTitle>
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      {children}
    </Card>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="px-4 py-8 text-center text-sm text-muted-foreground">
      {text}
    </p>
  );
}

function EventRow({
  reservation,
}: {
  reservation: Awaited<ReturnType<typeof getReservationRows>>["rows"][number];
}) {
  const date = parseISO(reservation.event_date);
  return (
    <li>
      <Link
        href={`/rezervasyonlar/${reservation.id}`}
        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
      >
        <div className="flex w-11 shrink-0 flex-col items-center rounded-lg bg-muted py-1">
          <span className="tabular text-base leading-tight font-semibold">
            {format(date, "d")}
          </span>
          <span className="text-[10px] text-muted-foreground uppercase">
            {format(date, "LLL", { locale: tr })}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {reservation.customer?.full_name ?? "—"}
          </p>
          <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: reservation.venue?.color }}
            />
            <span className="tabular">{reservation.start_time.slice(0, 5)}</span>·{" "}
            {reservation.venue?.name}
          </p>
        </div>

        <StageBadge
          status={reservation.status}
          deliveryStatus={reservation.delivery_status}
        />
      </Link>
    </li>
  );
}

/** "3 gün kaldı · 17.10" — tarihi geçmişse kırmızı "Gecikti". */
function DueLabel({ due, today }: { due: string; today: Date }) {
  const days = differenceInCalendarDays(parseISO(due), today);
  const text =
    days < 0
      ? `${-days} gün gecikti`
      : days === 0
        ? "Bugün"
        : days === 1
          ? "Yarın"
          : `${days} gün kaldı`;
  return (
    <p
      className={cn(
        "text-xs",
        days < 0
          ? "font-medium text-destructive"
          : days <= 3
            ? "font-medium text-warning"
            : "text-muted-foreground",
      )}
    >
      {text} · <span className="tabular">{formatDateShort(due)}</span>
    </p>
  );
}

type Transaction = {
  kind: "payment" | "expense";
  id: string;
  date: string;
  amount: number;
  title: string;
  subtitle: string;
};

function buildTransactions(
  payments: Payment[],
  expenses: Expense[],
  customerNames: Map<string, string>,
): Transaction[] {
  const items: Transaction[] = [
    ...payments.map<Transaction>((p) => ({
      kind: "payment",
      id: p.id,
      date: p.payment_date,
      amount: Number(p.amount),
      title: p.customer_id
        ? (customerNames.get(p.customer_id) ?? "Tahsilat")
        : (p.description ?? "Manuel gelir"),
      subtitle: PAYMENT_METHOD_LABELS[p.method],
    })),
    ...expenses.map<Transaction>((e) => ({
      kind: "expense",
      id: e.id,
      date: e.expense_date,
      amount: Number(e.amount),
      title: e.description ?? e.vendor ?? "Gider",
      subtitle: e.vendor ?? PAYMENT_METHOD_LABELS[e.method],
    })),
  ];

  return items.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8);
}

/** "Ayşe Nur Kaya" → "Ayşe". Ad boşsa selamlama yine düzgün okunsun. */
function firstName(fullName: string | null | undefined): string {
  return fullName?.trim().split(/\s+/)[0] || "";
}

/**
 * Karşılama başlığının altındaki özet:
 * "Bugün 2 organizasyon · Bu hafta 5 · 1 gecikmiş ödeme"
 */
function greetingSummary({
  todayCount,
  weekCount,
  overdue,
  eventLabel,
}: {
  todayCount: number;
  weekCount: number;
  overdue: number;
  eventLabel: string;
}): string {
  return [
    todayCount ? `Bugün ${todayCount} ${eventLabel}` : `Bugün ${eventLabel} yok`,
    weekCount ? `Bu hafta ${weekCount}` : "Bu hafta boş",
    overdue ? `${overdue} gecikmiş ödeme` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
