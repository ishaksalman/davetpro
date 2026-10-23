"use client";

import Link from "next/link";
import { AlertTriangle, Wallet } from "lucide-react";
import { DELIVERY_STATUS_LABELS, DELIVERY_STATUS_STYLES, DELIVERY_STATUS_FLOW } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatMoney } from "@/lib/format";
import type { ReservationRow } from "@/lib/queries";
import { DeliveryMenu } from "../rezervasyonlar/[id]/delivery-menu";
import { DueDateButton } from "./due-date-button";
import { DeliveryLinkButton } from "./delivery-link-button";
import { WhatsAppButton } from "@/components/shared/whatsapp-button";
import { useVertical } from "@/components/layout/vertical-provider";
import { deliveryMessage } from "@/lib/reservation-notice";

/** İki yyyy-MM-dd arasındaki gün farkı (a - b). Saat dilimine bağımlı değil. */
function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000);
}

/**
 * Teslim bekleyenler, aşamaya göre gruplu.
 *
 * Aşaması hiç belirlenmemiş işler en başta: çekim yapıldı ama akış
 * başlatılmadı demek, ilk ilgilenilmesi gereken yer orası. Grup içinde
 * hedef tarihi en yakın (ya da en çok geciken) iş üstte; hedefsizler sonda.
 *
 * `bugun` sunucudan geliyor: tarayıcı saati yerine işletmenin saat dilimi.
 * `showFinance` kapalıysa bakiye gösterilmiyor — finans yetkisi olmayan
 * kullanıcıda bakiye 0 gelir ve "borcu yok" gibi okunurdu.
 */
export function DeliveryBoard({
  rows,
  bugun,
  showFinance,
  businessName,
}: {
  rows: ReservationRow[];
  bugun: string;
  showFinance: boolean;
  businessName: string;
}) {
  const sozluk = useVertical();
  const kalan = (r: ReservationRow) =>
    r.delivery_due_date ? dayDiff(r.delivery_due_date, bugun) : null;

  const sirala = (list: ReservationRow[]) =>
    [...list].sort((x, y) => {
      const a = kalan(x);
      const b = kalan(y);
      if (a === null && b === null) return 0;
      if (a === null) return 1;
      if (b === null) return -1;
      return a - b;
    });

  const gruplar = [
    { key: null, label: "Aşama belirlenmedi", rows: sirala(rows.filter((r) => !r.delivery_status)) },
    ...DELIVERY_STATUS_FLOW.filter((d) => d !== "teslim_edildi").map((d) => ({
      key: d,
      label: DELIVERY_STATUS_LABELS[d],
      rows: sirala(rows.filter((r) => r.delivery_status === d)),
    })),
  ].filter((g) => g.rows.length > 0);

  const geciken = rows.filter((r) => (kalan(r) ?? 0) < 0).length;
  const hedefsiz = rows.filter((r) => !r.delivery_due_date).length;
  const acikBakiye = showFinance
    ? rows.reduce((t, r) => t + Math.max(0, Number(r.balance_amount)), 0)
    : 0;

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Summary label="Teslim bekleyen" value={String(rows.length)} />
        <Summary
          label="Geciken"
          value={String(geciken)}
          tone={geciken > 0 ? "danger" : undefined}
          hint={hedefsiz > 0 ? `${hedefsiz} işte hedef tarih yok` : undefined}
        />
        {showFinance && (
          <Summary
            label="Teslim bekleyenlerde kalan bakiye"
            value={formatMoney(acikBakiye)}
            tone={acikBakiye > 0 ? "warning" : undefined}
          />
        )}
      </dl>

      {gruplar.map((grup) => (
        <section key={grup.key ?? "yok"}>
          <h2 className="flex items-center gap-2 text-sm font-medium">
            {grup.label}
            <span className="text-xs text-muted-foreground">{grup.rows.length}</span>
          </h2>

          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {grup.rows.map((row) => {
              const gun = kalan(row);
              const gecikti = gun !== null && gun < 0;
              const bakiye = Number(row.balance_amount);
              return (
                <div
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4"
                >
                  <div className="min-w-0 space-y-2">
                    <div>
                      <Link
                        href={`/rezervasyonlar/${row.id}`}
                        className="font-medium hover:underline"
                      >
                        {row.customer?.full_name ?? "—"}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDate(row.event_date)}
                        {row.venue?.name ? ` · ${row.venue.name}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {row.delivery_status && (
                        <Badge
                          variant="outline"
                          className={DELIVERY_STATUS_STYLES[row.delivery_status]}
                        >
                          {DELIVERY_STATUS_LABELS[row.delivery_status]}
                        </Badge>
                      )}
                      <DueDateButton
                        reservationId={row.id}
                        eventDate={row.event_date}
                        value={row.delivery_due_date ?? null}
                        overdue={gecikti}
                        daysLeft={gun}
                      />
                      <DeliveryLinkButton
                        reservationId={row.id}
                        value={row.delivery_link ?? null}
                      />
                      {/* Bağlantı varsa müşteriye tek tıkla gönderilir; gönderme
                          kararı işletmede, otomatik gitmiyor. */}
                      {row.delivery_link && row.customer && (
                        <WhatsAppButton
                          phone={row.customer.phone}
                          size="sm"
                          label="Müşteriye gönder"
                          className="h-7 px-2 text-xs"
                          message={
                            deliveryMessage({
                              reservation: row,
                              customerName: row.customer.full_name,
                              businessName,
                              showFinance,
                              sozluk,
                            }) ?? undefined
                          }
                        />
                      )}
                    </div>
                    {/* Bakiye varken teslim: sözleşmede "kalan ödeme tamamlanmadan
                        teslim yapılmayabilir" yazıyor; kullanıcı görsün. */}
                    {showFinance && bakiye > 0 && (
                      <p className="flex items-center gap-1.5 text-xs text-warning">
                        <Wallet className="size-3.5" />
                        Kalan bakiye {formatMoney(bakiye)}
                      </p>
                    )}
                  </div>

                  <DeliveryMenu reservationId={row.id} status={row.delivery_status} />
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function Summary({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "danger" | "warning";
}) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={
          "tabular mt-1 flex items-center gap-1.5 text-xl font-semibold " +
          (tone === "danger" ? "text-destructive" : tone === "warning" ? "text-warning" : "")
        }
      >
        {tone === "danger" && <AlertTriangle className="size-4" />}
        {value}
      </dd>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
