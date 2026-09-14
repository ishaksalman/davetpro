"use client";

import Link from "next/link";
import { DELIVERY_STATUS_LABELS, DELIVERY_STATUS_STYLES, DELIVERY_STATUS_FLOW } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import type { ReservationRow } from "@/lib/queries";
import { DeliveryMenu } from "../rezervasyonlar/[id]/delivery-menu";

/**
 * Teslim bekleyenler, aşamaya göre gruplu.
 *
 * Aşaması hiç belirlenmemiş işler en başta: çekim yapıldı ama akış
 * başlatılmadı demek, ilk ilgilenilmesi gereken yer orası.
 */
export function DeliveryBoard({ rows }: { rows: ReservationRow[] }) {
  const gruplar = [
    { key: null, label: "Aşama belirlenmedi", rows: rows.filter((r) => !r.delivery_status) },
    ...DELIVERY_STATUS_FLOW.filter((d) => d !== "teslim_edildi").map((d) => ({
      key: d,
      label: DELIVERY_STATUS_LABELS[d],
      rows: rows.filter((r) => r.delivery_status === d),
    })),
  ].filter((g) => g.rows.length > 0);

  return (
    <div className="space-y-6">
      {gruplar.map((grup) => (
        <section key={grup.key ?? "yok"}>
          <h2 className="flex items-center gap-2 text-sm font-medium">
            {grup.label}
            <span className="text-xs text-muted-foreground">{grup.rows.length}</span>
          </h2>

          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {grup.rows.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4"
              >
                <div className="min-w-0">
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
                  {row.delivery_status && (
                    <Badge
                      variant="outline"
                      className={`mt-2 ${DELIVERY_STATUS_STYLES[row.delivery_status]}`}
                    >
                      {DELIVERY_STATUS_LABELS[row.delivery_status]}
                    </Badge>
                  )}
                </div>

                <DeliveryMenu reservationId={row.id} status={row.delivery_status} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
