import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { canSeeFinance, requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getReservationRows } from "@/lib/queries";
import { parseDateRange } from "@/lib/date-range";
import { formatDateShort, formatMoney, sumMoney } from "@/lib/format";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { ErrorState } from "@/components/shared/error-state";
import { StatCard } from "@/components/shared/stat-card";
import type { Expense, ExpenseCategory } from "@/lib/database.types";
import { ExpenseFormDialog } from "./expense-form-dialog";
import { ExpenseTable, type ExpenseRow } from "./expense-table";

export const metadata: Metadata = { title: "Giderler" };

export default async function ExpensesPage({ searchParams }: PageProps<"/giderler">) {
  const { profile } = await requireSession();
  if (!canSeeFinance(profile)) notFound();

  const params = await searchParams;
  const { from, to, preset } = parseDateRange(params);

  const supabase = await createClient();

  // Hepsi tek turda paralel gider; sıralı await her seferinde ~400 ms ekliyordu.
  const [expensesResult, categoriesResult, reservationsResult] = await Promise.all([
    supabase
      .from("expenses")
      .select("*")
      .gte("expense_date", from)
      .lte("expense_date", to)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false })
      .returns<Expense[]>(),
    supabase
      .from("expense_categories")
      .select("*")
      .order("name")
      .returns<ExpenseCategory[]>(),
    getReservationRows({ ascending: false }),
  ]);

  const categories = categoriesResult.data ?? [];
  const categoryNames = new Map(categories.map((c) => [c.id, c.name] as const));
  const reservations = new Map(reservationsResult.rows.map((r) => [r.id, r] as const));

  const rows: ExpenseRow[] = (expensesResult.data ?? []).map((expense) => {
    const reservation = expense.reservation_id
      ? reservations.get(expense.reservation_id)
      : undefined;

    return {
      ...expense,
      category_name: categoryNames.get(expense.category_id) ?? "—",
      reservation_label: reservation
        ? `${reservation.customer?.full_name ?? "—"} · ${formatDateShort(reservation.event_date)}`
        : null,
    };
  });

  const active = rows.filter((r) => !r.voided_at);
  const total = sumMoney(active.map((r) => r.amount));
  const linked = sumMoney(active.filter((r) => r.reservation_id).map((r) => r.amount));

  // En büyük kalemi öne çıkarmak, salon sahibinin ilk baktığı bilgidir.
  const byCategory = new Map<string, number>();
  for (const row of active) {
    byCategory.set(
      row.category_name,
      (byCategory.get(row.category_name) ?? 0) + Number(row.amount),
    );
  }
  const topCategory = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];

  const openReservations = reservationsResult.rows.filter(
    (r) => r.status !== "iptal_edildi",
  );

  return (
    <>
      <PageHeader
        title="Giderler"
        description="Organizasyona bağlı ve genel giderler"
        actions={
          <>
            <DateRangeFilter range={{ from, to }} preset={preset} />
            <ExpenseFormDialog
              categories={categories}
              reservations={openReservations}
              triggerButton={{ label: "Gider ekle", icon: "plus" }}
            />
          </>
        }
      />
      <PageBody>
        {/* Sorgu hatasında ₺0 göstermek yanıltıcı olur; açıkça hata bildiriyoruz. */}
        {expensesResult.error || categoriesResult.error || reservationsResult.error ? (
          <ErrorState
            message={
              expensesResult.error?.message ??
              categoriesResult.error?.message ??
              reservationsResult.error ??
              undefined
            }
          />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                label="Dönem gideri"
                value={formatMoney(total)}
                hint={`${active.length} kayıt`}
                tone="negative"
              />
              <StatCard
                label="Organizasyona bağlı"
                value={formatMoney(linked)}
                hint={`Genel gider: ${formatMoney(total - linked)}`}
              />
              <StatCard
                label="En yüksek kalem"
                value={topCategory ? formatMoney(topCategory[1]) : "—"}
                hint={topCategory?.[0] ?? "Kayıt yok"}
              />
            </div>

            <ExpenseTable
              expenses={rows}
              categories={categories}
              reservations={openReservations}
            />
          </>
        )}
      </PageBody>
    </>
  );
}
