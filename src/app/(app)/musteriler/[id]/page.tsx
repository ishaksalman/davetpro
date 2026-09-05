import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, Phone } from "lucide-react";
import { canSeeFinance, requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getReservationRows } from "@/lib/queries";
import { ORGANIZATION_TYPE_LABELS } from "@/lib/constants";
import {
  formatDate,
  formatDateShort,
  formatMoney,
  formatPhone,
  formatTimeRange,
  initials,
} from "@/lib/format";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Money } from "@/components/shared/money";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { WhatsAppButton } from "@/components/shared/whatsapp-button";
import type { Customer } from "@/lib/database.types";
import { CustomerFormDialog } from "../customer-form-dialog";

export const metadata: Metadata = { title: "Müşteri" };

export default async function CustomerDetailPage({
  params,
}: PageProps<"/musteriler/[id]">) {
  const { id } = await params;
  const { profile } = await requireSession();
  const showFinance = canSeeFinance(profile);

  const supabase = await createClient();

  const [{ data: customer, error: customerError }, { rows, error: rowsError }] =
    await Promise.all([
    supabase.from("customers").select("*").eq("id", id).maybeSingle<Customer>(),
    getReservationRows({ customerId: id, ascending: false }),
    ]);

  if (customerError) {
    return (
      <>
        <PageHeader title="Müşteri" />
        <PageBody>
          <ErrorState message={customerError.message} />
        </PageBody>
      </>
    );
  }
  if (!customer) notFound();

  const active = rows.filter((r) => r.status !== "iptal_edildi");
  const totalSales = active.reduce((sum, r) => sum + Number(r.net_amount), 0);
  const totalPaid = active.reduce((sum, r) => sum + Number(r.collected_amount), 0);
  const totalBalance = active.reduce((sum, r) => sum + Number(r.balance_amount), 0);

  return (
    <>
      <PageHeader
        title={customer.full_name}
        description={`${active.length} organizasyon`}
        back={{ href: "/musteriler", label: "Tüm müşteriler" }}
        actions={
          <CustomerFormDialog
            customer={customer}
            triggerButton={{
              label: "Düzenle",
              icon: "pencil",
              variant: "outline",
              labelHiddenOnMobile: true,
            }}
          />
        }
      />

      <PageBody>
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="min-w-0 space-y-6">
            {showFinance && (
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard label="Toplam satış" value={formatMoney(totalSales)} />
                <StatCard
                  label="Yapılan ödemeler"
                  value={formatMoney(totalPaid)}
                  tone="positive"
                />
                <StatCard
                  label="Kalan borç"
                  value={formatMoney(totalBalance)}
                  tone={totalBalance > 0 ? "pending" : "positive"}
                />
              </div>
            )}

            <section className="rounded-xl border bg-card">
              <header className="border-b px-5 py-4">
                <h2 className="font-medium">Organizasyonlar</h2>
              </header>

              {rowsError ? (
                <div className="p-5">
                  <ErrorState message={rowsError} />
                </div>
              ) : rows.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    title="Bu müşteriye ait organizasyon yok"
                    description="Rezervasyonlar sayfasından yeni bir organizasyon oluşturabilirsiniz."
                    className="border-0 py-8"
                  />
                </div>
              ) : (
                <ul className="divide-y">
                  {rows.map((reservation) => (
                    <li key={reservation.id}>
                      <Link
                        href={`/rezervasyonlar/${reservation.id}`}
                        className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-muted/50"
                      >
                        <div className="w-24 shrink-0">
                          <p className="tabular text-sm font-medium">
                            {formatDateShort(reservation.event_date)}
                          </p>
                          <p className="tabular text-xs text-muted-foreground">
                            {formatTimeRange(
                              reservation.start_time,
                              reservation.end_time,
                            )}
                          </p>
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">
                            {ORGANIZATION_TYPE_LABELS[reservation.organization_type]}
                          </p>
                          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span
                              aria-hidden
                              className="size-2 rounded-full"
                              style={{ backgroundColor: reservation.venue?.color }}
                            />
                            {reservation.venue?.name}
                          </p>
                        </div>

                        <StatusBadge status={reservation.status} />

                        {showFinance && (
                          <div className="w-28 text-right">
                            <Money value={reservation.net_amount} className="text-sm" />
                            {reservation.balance_amount > 0 && (
                              <p className="text-xs text-warning tabular">
                                Kalan {formatMoney(reservation.balance_amount)}
                              </p>
                            )}
                          </div>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-xl border bg-card p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                  {initials(customer.full_name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">{customer.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Kayıt: {formatDate(customer.created_at)}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2.5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <a
                    href={`tel:${customer.phone}`}
                    className="tabular flex items-center gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <Phone className="size-3.5" />
                    {formatPhone(customer.phone)}
                  </a>
                  <WhatsAppButton
                    phone={customer.phone}
                    message={`Merhaba ${customer.full_name},`}
                  />
                </div>

                {customer.phone2 && (
                  <div className="flex items-center justify-between gap-2">
                    <a
                      href={`tel:${customer.phone2}`}
                      className="tabular flex items-center gap-2 text-muted-foreground hover:text-foreground"
                    >
                      <Phone className="size-3.5" />
                      {formatPhone(customer.phone2)}
                    </a>
                    <WhatsAppButton phone={customer.phone2} />
                  </div>
                )}

                {customer.email && (
                  <a
                    href={`mailto:${customer.email}`}
                    className="flex items-center gap-2 truncate text-muted-foreground hover:text-foreground"
                  >
                    <Mail className="size-3.5 shrink-0" />
                    {customer.email}
                  </a>
                )}
              </div>
            </section>

            {customer.notes && (
              <section className="rounded-xl border bg-card p-5">
                <h2 className="font-medium">Notlar</h2>
                <p className="mt-2 text-sm whitespace-pre-line text-muted-foreground">
                  {customer.notes}
                </p>
              </section>
            )}
          </aside>
        </div>
      </PageBody>
    </>
  );
}
