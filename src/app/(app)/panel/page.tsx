import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDownCircle,
  ArrowRight,
  ArrowUpCircle,
  CalendarClock,
  CalendarDays,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { endOfMonth, startOfMonth, subMonths } from "date-fns";
import { canSeeFinance, requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getLookups, getReservationRows } from "@/lib/queries";
import { today as businessToday, todayISO } from "@/lib/time";
import { ORGANIZATION_TYPE_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/constants";
import {
  formatDate,
  formatDateShort,
  formatMoney,
  formatNumber,
  formatTimeRange,
  toISODate,
} from "@/lib/format";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { CashflowChart } from "@/components/charts/cashflow-chart";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Money } from "@/components/shared/money";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { WhatsAppButton } from "@/components/shared/whatsapp-button";
import { Button } from "@/components/ui/button";
import type {
  Expense,
  FinanceSummary,
  MonthlySeriesRow,
  Payment,
} from "@/lib/database.types";
import { ReservationFormDialog } from "../rezervasyonlar/reservation-form-dialog";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { profile, business } = await requireSession();
  const showFinance = canSeeFinance(profile);

  // Sunucunun değil işletmenin saatine göre "bugün".
  const now = businessToday();
  const today = todayISO();
  const monthStart = toISODate(startOfMonth(now));
  const monthEnd = toISODate(endOfMonth(now));
  const seriesStart = toISODate(startOfMonth(subMonths(now, 5)));

  const supabase = await createClient();

  const [lookups, reservationsResult, summaryResult, seriesResult, recentPayments, recentExpenses] =
    await Promise.all([
      getLookups(),
      getReservationRows({ from: today }),
      showFinance
        ? supabase.rpc("finance_summary", { p_from: monthStart, p_to: monthEnd })
        : Promise.resolve({ data: null }),
      showFinance
        ? supabase.rpc("monthly_series", { p_from: seriesStart, p_to: monthEnd })
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

  const upcoming = reservationsResult.rows.filter((r) => r.status !== "iptal_edildi");
  const todayEvents = upcoming.filter((r) => r.event_date === today);
  const nextEvents = upcoming.filter((r) => r.event_date > today).slice(0, 5);

  const summary = (summaryResult.data as FinanceSummary[] | null)?.[0] ?? null;
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
        title={business.name}
        description={`Bugün ${formatDate(now)}`}
        actions={
          hasVenue && (
            <ReservationFormDialog
              customers={lookups.customers}
              venues={lookups.venues}
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
            description="Salonlarınızı tanımlayın, ardından paketlerinizi ekleyin. Sonrasında rezervasyon almaya başlayabilirsiniz."
            action={
              <Button asChild>
                <Link href="/salonlar">Salonları tanımla</Link>
              </Button>
            }
          />
        )}

        {showFinance && summary && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Bu ayki organizasyon"
                value={formatNumber(summary.reservation_count)}
                hint={
                  summary.avg_sale
                    ? `Ortalama ${formatMoney(summary.avg_sale)}`
                    : undefined
                }
                icon={CalendarDays}
              />
              <StatCard
                label="Bu ayki toplam satış"
                value={formatMoney(summary.total_sales)}
                hint="Organizasyon tarihine göre"
                icon={TrendingUp}
              />
              <StatCard
                label="Bu ay tahsil edilen"
                value={formatMoney(summary.collected_in_range)}
                hint="Kasaya giren"
                tone="positive"
                icon={ArrowDownCircle}
              />
              <StatCard
                label="Bekleyen tahsilat"
                value={formatMoney(summary.outstanding)}
                hint="Bu ayki organizasyonlardan"
                tone={Number(summary.outstanding) > 0 ? "pending" : "default"}
                icon={Wallet}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                label="Bu ayki gider"
                value={formatMoney(summary.total_expenses)}
                tone="negative"
                icon={ArrowUpCircle}
              />
              <StatCard
                label="Net nakit"
                value={formatMoney(summary.net_cash)}
                hint="Tahsilat − gider"
                tone={Number(summary.net_cash) >= 0 ? "positive" : "negative"}
              />
              <StatCard
                label="Bu ayki kâr"
                value={formatMoney(summary.profit)}
                hint="Satış − gider (muhasebesel)"
                tone={Number(summary.profit) >= 0 ? "default" : "negative"}
              />
            </div>
          </>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
          <div className="min-w-0 space-y-6">
            {showFinance && series.length > 0 && (
              <section className="rounded-xl border bg-card p-5">
                <header className="mb-4">
                  <h2 className="font-medium">Nakit akışı</h2>
                  <p className="text-xs text-muted-foreground">
                    Son 6 ayda tahsil edilen tutar ve ödenen giderler
                  </p>
                </header>
                <CashflowChart data={series} />
              </section>
            )}

            <Panel
              title="Bugünkü organizasyonlar"
              hint={todayEvents.length ? `${todayEvents.length} organizasyon` : undefined}
            >
              {todayEvents.length === 0 ? (
                <Empty text="Bugün planlanmış organizasyon yok." />
              ) : (
                <ul className="divide-y">
                  {todayEvents.map((r) => (
                    <EventRow key={r.id} reservation={r} showFinance={showFinance} showToday />
                  ))}
                </ul>
              )}
            </Panel>

            {showFinance && (
              <Panel title="Son işlemler">
                {transactions.length === 0 ? (
                  <Empty text="Henüz finansal işlem kaydı yok." />
                ) : (
                  <ul className="divide-y">
                    {transactions.map((t) => (
                      <li
                        key={`${t.kind}-${t.id}`}
                        className="flex items-center gap-3 px-5 py-3.5"
                      >
                        <span
                          className={
                            t.kind === "payment"
                              ? "grid size-8 shrink-0 place-items-center rounded-full bg-success/10 text-success"
                              : "grid size-8 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive"
                          }
                        >
                          {t.kind === "payment" ? (
                            <ArrowDownCircle className="size-4" />
                          ) : (
                            <ArrowUpCircle className="size-4" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{t.title}</p>
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

          <aside className="space-y-6">
            <Panel
              title="Yaklaşan organizasyonlar"
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
                <Empty text="Planlanmış organizasyon yok." />
              ) : (
                <ul className="divide-y">
                  {nextEvents.map((r) => (
                    <EventRow key={r.id} reservation={r} showFinance={showFinance} compact />
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
                      <li key={r.id} className="flex items-center gap-3 px-5 py-3.5">
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/rezervasyonlar/${r.id}`}
                            className="block truncate text-sm font-medium hover:underline"
                          >
                            {r.customer?.full_name ?? "—"}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            <CalendarClock className="mr-1 inline size-3" />
                            {formatDateShort(r.due_date!)}
                          </p>
                        </div>
                        <Money value={r.balance_amount} tone="pending" className="text-sm" />
                        <WhatsAppButton
                          phone={r.customer?.phone}
                          message={`Merhaba ${r.customer?.full_name ?? ""}, ${formatDate(r.event_date)} tarihli organizasyonunuz için kalan ödemeniz ${formatMoney(r.balance_amount)}.`}
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
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card">
      <header className="flex items-center justify-between gap-3 border-b px-5 py-4">
        <div>
          <h2 className="font-medium">{title}</h2>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="px-5 py-8 text-center text-sm text-muted-foreground">{text}</p>;
}

function EventRow({
  reservation,
  showFinance,
  compact,
  showToday,
}: {
  reservation: Awaited<ReturnType<typeof getReservationRows>>["rows"][number];
  showFinance: boolean;
  compact?: boolean;
  showToday?: boolean;
}) {
  return (
    <li>
      <Link
        href={`/rezervasyonlar/${reservation.id}`}
        className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3.5 transition-colors hover:bg-muted/50"
      >
        <div className={compact ? "w-16 shrink-0" : "w-20 shrink-0"}>
          <p className="tabular text-sm font-medium">
            {showToday
              ? formatTimeRange(reservation.start_time, reservation.end_time)
              : formatDateShort(reservation.event_date)}
          </p>
          {!showToday && (
            <p className="tabular text-xs text-muted-foreground">
              {reservation.start_time.slice(0, 5)}
            </p>
          )}
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
            {reservation.venue?.name} ·{" "}
            {ORGANIZATION_TYPE_LABELS[reservation.organization_type]}
          </p>
        </div>

        {compact ? (
          <StatusBadge status={reservation.status} />
        ) : (
          <>
            <StatusBadge status={reservation.status} />
            {showFinance && reservation.balance_amount > 0 && (
              <Money value={reservation.balance_amount} tone="pending" className="text-sm" />
            )}
          </>
        )}
      </Link>
    </li>
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
