import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { canSeeFinance, requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getLookups, getReservationRows } from "@/lib/queries";
import { parseDateRange } from "@/lib/date-range";
import { formatDateShort, formatMoney, sumMoney } from "@/lib/format";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { ErrorState } from "@/components/shared/error-state";
import { StatCard } from "@/components/shared/stat-card";
import type { Payment } from "@/lib/database.types";
import { PaymentFormDialog } from "./payment-form-dialog";
import { PaymentTable, type PaymentRow } from "./payment-table";

export const metadata: Metadata = { title: "Gelirler" };

export default async function IncomePage({ searchParams }: PageProps<"/gelirler">) {
  const { profile } = await requireSession();
  if (!canSeeFinance(profile)) notFound();

  const params = await searchParams;
  const { from, to, preset } = parseDateRange(params);

  const supabase = await createClient();

  const [lookups, paymentsResult, reservationsResult] = await Promise.all([
    getLookups(),
    supabase
      .from("payments")
      .select("*")
      .gte("payment_date", from)
      .lte("payment_date", to)
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false })
      .returns<Payment[]>(),
    // Ödeme eklerken bağlanabilecek rezervasyonlar (tarih aralığından bağımsız).
    getReservationRows({ ascending: false }),
  ]);

  const customers = new Map(lookups.customers.map((c) => [c.id, c] as const));
  const reservations = new Map(reservationsResult.rows.map((r) => [r.id, r] as const));

  const rows: PaymentRow[] = (paymentsResult.data ?? []).map((payment) => {
    const reservation = payment.reservation_id
      ? reservations.get(payment.reservation_id)
      : undefined;
    const customer = payment.customer_id ? customers.get(payment.customer_id) : undefined;

    return {
      ...payment,
      customer_name: customer?.full_name ?? reservation?.customer?.full_name ?? null,
      reservation_label: reservation
        ? `${reservation.venue?.name ?? ""} · ${formatDateShort(reservation.event_date)}`
        : null,
    };
  });

  const active = rows.filter((r) => !r.voided_at);
  const total = sumMoney(active.map((r) => r.amount));
  const cash = sumMoney(
    active.filter((r) => r.method === "nakit").map((r) => r.amount),
  );
  const linked = sumMoney(
    active.filter((r) => r.reservation_id).map((r) => r.amount),
  );

  const openReservations = reservationsResult.rows.filter(
    (r) => r.status !== "iptal_edildi",
  );

  return (
    <>
      <PageHeader
        title="Gelirler"
        description="Tahsil edilen tutarlar — nakit akışı"
        actions={
          <>
            <DateRangeFilter range={{ from, to }} preset={preset} />
            <PaymentFormDialog
              reservations={openReservations}
              triggerButton={{ label: "Tahsilat ekle", icon: "plus" }}
            />
          </>
        }
      />
      <PageBody>
        {/* Sorgu hatasında ₺0 göstermek yanıltıcı olur; açıkça hata bildiriyoruz. */}
        {paymentsResult.error || reservationsResult.error ? (
          <ErrorState
            message={paymentsResult.error?.message ?? reservationsResult.error ?? undefined}
          />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                label="Dönem tahsilatı"
                value={formatMoney(total)}
                hint={`${active.length} işlem`}
                tone="positive"
              />
              <StatCard
                label="Rezervasyona bağlı"
                value={formatMoney(linked)}
                hint={`Manuel gelir: ${formatMoney(total - linked)}`}
              />
              <StatCard label="Nakit tahsilat" value={formatMoney(cash)} />
            </div>

            <PaymentTable payments={rows} reservations={openReservations} />
          </>
        )}
      </PageBody>
    </>
  );
}
