import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleAlert, FileText, Phone, Users } from "lucide-react";
import { canSeeFinance, requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getLookups, getReservationById } from "@/lib/queries";
import {
  ORGANIZATION_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  INCOME_CATEGORY_LABELS,
  CONTRACT_STATUS_LABELS,
} from "@/lib/constants";
import {
  formatDate,
  formatDateLong,
  formatMoney,
  formatNumber,
  formatPercent,
  formatPhone,
  formatTimeRange,
} from "@/lib/format";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { Money } from "@/components/shared/money";
import { StatusBadge } from "@/components/shared/status-badge";
import { WhatsAppButton } from "@/components/shared/whatsapp-button";
import { reservationNoticeMessage } from "@/lib/reservation-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type {
  Contract,
  Expense,
  ExpenseCategory,
  Payment,
} from "@/lib/database.types";
import { ExpenseFormDialog } from "../../giderler/expense-form-dialog";
import { PaymentFormDialog } from "../../gelirler/payment-form-dialog";
import { ReservationFormDialog } from "../reservation-form-dialog";
import { ReservationStatusMenu } from "./status-menu";
import { VoidPaymentButton, VoidExpenseButton } from "./void-buttons";

export const metadata: Metadata = { title: "Rezervasyon" };

export default async function ReservationDetailPage({
  params,
}: PageProps<"/rezervasyonlar/[id]">) {
  const { id } = await params;
  const { profile, business } = await requireSession();
  const showFinance = canSeeFinance(profile);

  const supabase = await createClient();

  // Tek kayıt sorgulanır; eskiden tüm rezervasyonlar çekilip find() yapılıyordu.
  const [
    reservationResult,
    lookups,
    paymentsResult,
    expensesResult,
    categoriesResult,
    leadResult,
    contractResult,
  ] = await Promise.all([
      getReservationById(id),
      getLookups(),
      supabase
        .from("payments")
        .select("*")
        .eq("reservation_id", id)
        .order("payment_date", { ascending: true })
        .returns<Payment[]>(),
      supabase
        .from("expenses")
        .select("*")
        .eq("reservation_id", id)
        .order("expense_date", { ascending: true })
        .returns<Expense[]>(),
      supabase
        .from("expense_categories")
        .select("*")
        .order("name")
        .returns<ExpenseCategory[]>(),
      // Bu rezervasyon bir talepten mi doğdu?
      supabase
        .from("leads")
        .select("id")
        .eq("reservation_id", id)
        .maybeSingle<{ id: string }>(),
      // Sözleşmenin yalnızca en güncel sürümü; kart durumunu göstermek için.
      showFinance
        ? supabase
            .from("contracts")
            .select("id, contract_number, status, version, created_at")
            .eq("reservation_id", id)
            .order("version", { ascending: false })
            .limit(1)
            .maybeSingle<
              Pick<
                Contract,
                "id" | "contract_number" | "status" | "version" | "created_at"
              >
            >()
        : Promise.resolve({ data: null }),
    ]);

  // Finansal veri okunamadıysa sessizce ₺0 göstermek yerine hatayı bildir.
  if (reservationResult.error) {
    return (
      <>
        <PageHeader title="Rezervasyon" />
        <PageBody>
          <ErrorState message={reservationResult.error} />
        </PageBody>
      </>
    );
  }

  const reservation = reservationResult.reservation;
  if (!reservation) notFound();

  const payments = paymentsResult.data ?? [];
  const expenses = expensesResult.data ?? [];
  const categories = categoriesResult.data ?? [];
  const categoryNames = new Map(categories.map((c) => [c.id, c.name] as const));

  const customer = lookups.customers.find((c) => c.id === reservation.customer_id);

  return (
    <>
      <PageHeader
        title={reservation.customer?.full_name ?? "Rezervasyon"}
        description={`${formatDateLong(reservation.event_date)} · ${reservation.venue?.name ?? ""}`}
        back={{ href: "/rezervasyonlar", label: "Tüm rezervasyonlar" }}
        actions={
          <>
            <ReservationStatusMenu
              reservationId={reservation.id}
              status={reservation.status}
            />
            <ReservationFormDialog
              reservation={reservation}
              customers={lookups.customers}
              venues={lookups.venues}
              packages={lookups.packages}
              showFinance={showFinance}
              triggerButton={{
                label: "Düzenle",
                icon: "pencil",
                variant: "outline",
                labelHiddenOnMobile: true,
              }}
            />
          </>
        }
      />

      <PageBody>
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="min-w-0 space-y-6">
            {/* Organizasyon bilgileri */}
            <section className="rounded-xl border bg-card">
              <header className="flex items-center justify-between gap-3 border-b px-5 py-4">
                <h2 className="font-medium">Organizasyon</h2>
                <StatusBadge status={reservation.status} />
              </header>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 p-5 sm:grid-cols-3">
                <Detail label="Tür">
                  {ORGANIZATION_TYPE_LABELS[reservation.organization_type]}
                </Detail>
                <Detail label="Salon">{reservation.venue?.name ?? "—"}</Detail>
                <Detail label="Paket">{reservation.package?.name ?? "Paketsiz"}</Detail>
                <Detail label="Tarih">{formatDate(reservation.event_date)}</Detail>
                <Detail label="Saat">
                  {formatTimeRange(reservation.start_time, reservation.end_time)}
                </Detail>
                <Detail label="Kişi sayısı">
                  {reservation.guest_count
                    ? `${formatNumber(reservation.guest_count)} kişi`
                    : "—"}
                </Detail>
              </dl>
              {leadResult.data && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/40 px-5 py-3">
                  <p className="text-sm text-muted-foreground">
                    Bu rezervasyon bir talepten dönüştürüldü.
                  </p>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/talepler/${leadResult.data.id}`}>Talebi görüntüle</Link>
                  </Button>
                </div>
              )}

              {reservation.notes && (
                <div className="border-t px-5 py-4">
                  <p className="text-xs text-muted-foreground">Notlar</p>
                  <p className="mt-1 text-sm whitespace-pre-line">{reservation.notes}</p>
                </div>
              )}
            </section>

            {showFinance && (
              <>
                {/* Tahsilatlar */}
                <section className="rounded-xl border bg-card">
                  <header className="flex items-center justify-between gap-3 border-b px-5 py-4">
                    <div>
                      <h2 className="font-medium">Tahsilatlar</h2>
                      <p className="text-xs text-muted-foreground">
                        {payments.filter((p) => !p.voided_at).length} ödeme kaydı
                      </p>
                    </div>
                    <PaymentFormDialog
                      reservations={[reservation]}
                      lockedReservation={reservation}
                      suggestedAmount={reservation.balance_amount}
                      triggerButton={{
                        label: "Ödeme ekle",
                        icon: "plus",
                        variant: "outline",
                        size: "sm",
                      }}
                    />
                  </header>

                  {payments.length === 0 ? (
                    <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                      Henüz ödeme alınmamış.
                    </p>
                  ) : (
                    <ul className="divide-y">
                      {payments.map((payment) => (
                        <li
                          key={payment.id}
                          className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5"
                        >
                          <span className="tabular w-20 shrink-0 text-sm text-muted-foreground">
                            {formatDate(payment.payment_date)}
                          </span>
                          <span className="min-w-0 flex-1 text-sm">
                            <span className="font-medium">
                              {INCOME_CATEGORY_LABELS[payment.category]}
                            </span>
                            <span className="text-muted-foreground">
                              {" · "}
                              {PAYMENT_METHOD_LABELS[payment.method]}
                            </span>
                            {payment.voided_at && (
                              <span className="block text-xs text-destructive">
                                İptal edildi — {payment.void_reason}
                              </span>
                            )}
                          </span>
                          {payment.voided_at ? (
                            <span className="line-through">
                              <Money value={payment.amount} tone="muted" />
                            </span>
                          ) : (
                            <>
                              <Money value={payment.amount} tone="positive" />
                              <VoidPaymentButton id={payment.id} />
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {/* Organizasyona bağlı giderler */}
                <section className="rounded-xl border bg-card">
                  <header className="flex items-center justify-between gap-3 border-b px-5 py-4">
                    <div>
                      <h2 className="font-medium">Bu organizasyona bağlı giderler</h2>
                      <p className="text-xs text-muted-foreground">
                        Kârlılık hesabına giren kalemler
                      </p>
                    </div>
                    <ExpenseFormDialog
                      categories={categories}
                      reservations={[reservation]}
                      lockedReservation={reservation}
                      triggerButton={{
                        label: "Gider ekle",
                        icon: "plus",
                        variant: "outline",
                        size: "sm",
                      }}
                    />
                  </header>

                  {expenses.length === 0 ? (
                    <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                      Bu organizasyona bağlı gider yok.
                    </p>
                  ) : (
                    <ul className="divide-y">
                      {expenses.map((expense) => (
                        <li
                          key={expense.id}
                          className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5"
                        >
                          <span className="tabular w-20 shrink-0 text-sm text-muted-foreground">
                            {formatDate(expense.expense_date)}
                          </span>
                          <span className="min-w-0 flex-1 text-sm">
                            <span className="font-medium">
                              {categoryNames.get(expense.category_id) ?? "—"}
                            </span>
                            {expense.description && (
                              <span className="text-muted-foreground">
                                {" · "}
                                {expense.description}
                              </span>
                            )}
                            {expense.voided_at && (
                              <span className="block text-xs text-destructive">
                                İptal edildi — {expense.void_reason}
                              </span>
                            )}
                          </span>
                          {expense.voided_at ? (
                            <span className="line-through">
                              <Money value={expense.amount} tone="muted" />
                            </span>
                          ) : (
                            <>
                              <Money value={expense.amount} tone="negative" />
                              <VoidExpenseButton id={expense.id} />
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}
          </div>

          {/* Sağ sütun */}
          <aside className="space-y-6">
            {showFinance && (
              <section className="rounded-xl border bg-card p-5">
                <h2 className="font-medium">Finans özeti</h2>

                <p className="mt-1 text-xs text-muted-foreground">
                  Kârlılık ve nakit akışı ayrı kavramlardır.
                </p>

                <dl className="mt-4 space-y-2.5 text-sm">
                  <Row label="Anlaşılan fiyat">
                    <Money value={reservation.pricing?.gross_amount ?? 0} tone="muted" />
                  </Row>
                  {reservation.unit_price && reservation.guest_count ? (
                    <Row label="Kişi başı">
                      <span className="tabular text-muted-foreground">
                        {formatMoney(reservation.unit_price)} ×{" "}
                        {formatNumber(reservation.guest_count)}
                      </span>
                    </Row>
                  ) : null}
                  <Row label="İndirim">
                    <Money
                      value={reservation.pricing?.discount_amount ?? 0}
                      tone="muted"
                    />
                  </Row>
                  <Row label="Net satış" strong>
                    <Money value={reservation.net_amount} />
                  </Row>
                </dl>

                <Separator className="my-4" />

                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Nakit akışı
                </p>
                <dl className="mt-2.5 space-y-2.5 text-sm">
                  <Row label="Tahsil edilen">
                    <Money value={reservation.collected_amount} tone="positive" />
                  </Row>
                  <Row label="Kalan ödeme" strong>
                    <Money
                      value={reservation.balance_amount}
                      tone={reservation.balance_amount > 0 ? "pending" : "positive"}
                    />
                  </Row>
                  {reservation.due_date && (
                    <Row label="Ödeme tarihi">
                      <span className="tabular text-muted-foreground">
                        {formatDate(reservation.due_date)}
                      </span>
                    </Row>
                  )}
                </dl>

                <Separator className="my-4" />

                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Kârlılık
                </p>
                {/* Gider girilmemişken kâr = net satış çıkıyor ve ekran
                    "%100 kâr" diyor. Bu bir sonuç değil, eksik veri; rakam
                    uydurmak yerine durumu söylüyoruz. */}
                {reservation.expense_amount === 0 ? (
                  <p className="mt-2.5 flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2.5 text-sm text-amber-800 dark:text-amber-300">
                    <CircleAlert className="mt-0.5 size-4 shrink-0" />
                    <span>
                      Bu organizasyona bağlı gider girilmedi. Kâr hesabı için
                      önce giderleri ekleyin.
                    </span>
                  </p>
                ) : (
                  <dl className="mt-2.5 space-y-2.5 text-sm">
                    <Row label="Bağlı gider">
                      <Money value={reservation.expense_amount} tone="negative" />
                    </Row>
                    <Row label="Kâr" strong>
                      <Money
                        value={reservation.profit_amount}
                        tone={reservation.profit_amount >= 0 ? "positive" : "negative"}
                      />
                    </Row>
                    <Row label="Kâr marjı">
                      <span className="tabular font-medium">
                        {formatPercent(reservation.profit_margin)}
                      </span>
                    </Row>
                  </dl>
                )}
              </section>
            )}

            {showFinance && (
              <section className="rounded-xl border bg-card p-5">
                <h2 className="font-medium">Sözleşme</h2>
                {contractResult.data ? (
                  <>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="tabular text-sm font-medium">
                        {contractResult.data.contract_number}
                      </span>
                      <Badge
                        variant={
                          contractResult.data.status === "iptal"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {CONTRACT_STATUS_LABELS[contractResult.data.status]}
                      </Badge>
                      {contractResult.data.version > 1 && (
                        <Badge variant="outline">
                          {contractResult.data.version}. sürüm
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {contractResult.data.status === "iptal"
                        ? "Bu sözleşme iptal edildi. Rezervasyon devam ediyorsa yenisini hazırlayabilirsiniz."
                        : `${formatDate(contractResult.data.created_at)} tarihinde oluşturuldu.`}
                    </p>
                    {/* İptal edilmişse asıl ihtiyaç yenisini hazırlamak;
                        sözleşme sayfası iptal edileni de gösteriyor. */}
                    <Button
                      asChild
                      variant={
                        contractResult.data.status === "iptal"
                          ? "default"
                          : "outline"
                      }
                      className="mt-3 w-full"
                    >
                      <Link href={`/rezervasyonlar/${reservation.id}/sozlesme`}>
                        <FileText />
                        {contractResult.data.status === "iptal"
                          ? "Yeni sözleşme oluştur"
                          : "Sözleşmeyi görüntüle"}
                      </Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Bu rezervasyon için henüz sözleşme hazırlanmadı.
                    </p>
                    <Button asChild variant="outline" className="mt-3 w-full">
                      <Link href={`/rezervasyonlar/${reservation.id}/sozlesme`}>
                        <FileText />
                        Sözleşme oluştur
                      </Link>
                    </Button>
                  </>
                )}
              </section>
            )}

            {customer && (
              <section className="rounded-xl border bg-card p-5">
                <h2 className="font-medium">Müşteri</h2>
                <Link
                  href={`/musteriler/${customer.id}`}
                  className="mt-2 block text-sm font-medium hover:underline"
                >
                  {customer.full_name}
                </Link>

                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <a
                      href={`tel:${customer.phone}`}
                      className="tabular flex items-center gap-2 text-muted-foreground hover:text-foreground"
                    >
                      <Phone className="size-3.5" />
                      {formatPhone(customer.phone)}
                    </a>
                    <WhatsAppButton phone={customer.phone} />
                  </div>

                  {customer.phone2 && (
                    <a
                      href={`tel:${customer.phone2}`}
                      className="tabular flex items-center gap-2 text-muted-foreground hover:text-foreground"
                    >
                      <Phone className="size-3.5" />
                      {formatPhone(customer.phone2)}
                    </a>
                  )}

                  {customer.email && (
                    <a
                      href={`mailto:${customer.email}`}
                      className="block truncate text-muted-foreground hover:text-foreground"
                    >
                      {customer.email}
                    </a>
                  )}
                </div>

                {/* Otomatik gönderilmiyor: hazır mesajla WhatsApp açılıyor,
                    göndermeye salon sahibi karar veriyor. */}
                <WhatsAppButton
                  phone={customer.phone}
                  size="sm"
                  // Yalnızca bu düğme: duruyorken açık yeşil zemin, üzerine
                  // gelince tam WhatsApp yeşili. Listelerdeki simge düğmeleri
                  // varsayılan görünümünde kalıyor.
                  className="mt-3 w-full justify-center bg-[#25D366]/10 hover:bg-[#25D366] hover:text-white"
                  label="Müşteriyi bilgilendir"
                  message={reservationNoticeMessage({
                    reservation,
                    customerName: customer.full_name,
                    businessName: business.name,
                    showFinance,
                  })}
                />
              </section>
            )}

            {!showFinance && (
              <section className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
                <Users className="mb-2 size-4" />
                Finansal bilgileri görme yetkiniz bulunmuyor.
              </section>
            )}

          </aside>
        </div>
      </PageBody>
    </>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{children}</dd>
    </div>
  );
}

function Row({
  label,
  children,
  strong,
}: {
  label: string;
  children: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className={strong ? "font-medium" : "text-muted-foreground"}>{label}</dt>
      <dd className={strong ? "font-semibold" : ""}>{children}</dd>
    </div>
  );
}
