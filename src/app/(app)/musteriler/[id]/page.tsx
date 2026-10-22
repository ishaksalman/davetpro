import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, Phone } from "lucide-react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { canSeeFinance, requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getReservationRows } from "@/lib/queries";
import { ORGANIZATION_TYPE_LABELS } from "@/lib/constants";
import {
  formatDate,
  formatMoney,
  formatPhone,
  formatTimeRange,
  initials,
} from "@/lib/format";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Money } from "@/components/shared/money";
import { StageBadge } from "@/components/shared/stage-badge";
import { WhatsAppButton } from "@/components/shared/whatsapp-button";
import type { Customer } from "@/lib/database.types";
import { CustomerFormDialog } from "../customer-form-dialog";
import { vertical, buyukHarf } from "@/lib/vertical";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Müşteri" };

export default async function CustomerDetailPage({
  params,
}: PageProps<"/musteriler/[id]">) {
  const { id } = await params;
  const { profile, business } = await requireSession();
  const sozluk = vertical(business.business_type);
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
        description={`${active.length} ${sozluk.event.singular}`}
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="min-w-0 space-y-6">
            {showFinance && (
              // Tek kartta üç hücre: alt alta üç kart mobilde ekranın yarısını
              // tutuyordu.
              <dl className="grid grid-cols-3 divide-x rounded-xl border bg-card">
                <SummaryCell label="Toplam satış" value={totalSales} />
                <SummaryCell
                  label="Ödenen"
                  value={totalPaid}
                  className="text-success"
                />
                <SummaryCell
                  label="Kalan borç"
                  value={totalBalance}
                  className={totalBalance > 0 ? "text-warning" : "text-success"}
                />
              </dl>
            )}

            <section className="rounded-xl border bg-card">
              <header className="border-b px-5 py-4">
                <h2 className="font-medium">{buyukHarf(sozluk.event.plural)}</h2>
              </header>

              {rowsError ? (
                <div className="p-5">
                  <ErrorState message={rowsError} />
                </div>
              ) : rows.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    title={`Bu müşteriye ait ${sozluk.event.singular} yok`}
                    description={`Rezervasyonlar sayfasından yeni bir ${sozluk.event.singular} oluşturabilirsiniz.`}
                    className="border-0 py-8"
                  />
                </div>
              ) : (
                <ul className="divide-y">
                  {rows.map((reservation) => (
                    <li key={reservation.id}>
                      <Link
                        href={`/rezervasyonlar/${reservation.id}`}
                        className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/50 sm:px-5"
                      >
                        <DateChip date={reservation.event_date} />

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {ORGANIZATION_TYPE_LABELS[reservation.organization_type]}
                          </p>
                          <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="tabular shrink-0">
                              {formatTimeRange(reservation.start_time, reservation.end_time)}
                            </span>
                            <span
                              aria-hidden
                              className="size-2 shrink-0 rounded-full"
                              style={{ backgroundColor: reservation.venue?.color }}
                            />
                            <span className="truncate">{reservation.venue?.name}</span>
                          </p>
                          <StageBadge
                            status={reservation.status}
                            deliveryStatus={reservation.delivery_status}
                            className="mt-1.5"
                          />
                        </div>

                        {showFinance && (
                          <div className="shrink-0 text-right">
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

function SummaryCell({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className="min-w-0 px-3 py-3 sm:px-5 sm:py-4">
      <dt className="truncate text-xs text-muted-foreground sm:text-sm">{label}</dt>
      <dd
        className={cn(
          "tabular mt-1 truncate text-base font-semibold tracking-tight sm:text-2xl",
          className,
        )}
      >
        {formatMoney(value)}
      </dd>
    </div>
  );
}

/** Gün ve ay–yıl; müşteri geçmişi yıllara yayılabildiği için yıl da var. */
function DateChip({ date }: { date: string }) {
  const d = parseISO(date);
  return (
    <div className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-muted py-1">
      <span className="tabular text-base leading-tight font-semibold">{format(d, "d")}</span>
      <span className="text-[10px] text-muted-foreground uppercase">
        {format(d, "LLL yy", { locale: tr })}
      </span>
    </div>
  );
}
