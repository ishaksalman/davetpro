"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Building2 } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { subscriptionInfo, type SubscriptionState } from "@/lib/subscription";
import type { AdminBusinessRow } from "@/lib/database.types";
import { ExtendAccessDialog } from "./extend-access-dialog";

const DURUM_ETIKET: Record<SubscriptionState, string> = {
  deneme: "Deneme",
  abone: "Abone",
  sona_erdi: "Süresi doldu",
};

const DURUM_STIL: Record<SubscriptionState, string> = {
  deneme:
    "bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-900",
  abone:
    "bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-900",
  sona_erdi:
    "bg-rose-100 text-rose-800 ring-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:ring-rose-900",
};

export function SubscriptionTable({ rows }: { rows: AdminBusinessRow[] }) {
  const columns = useMemo<ColumnDef<AdminBusinessRow, unknown>[]>(
    () => [
      {
        accessorKey: "business_name",
        header: "İşletme",
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate font-medium">{row.original.business_name}</div>
            <div className="truncate text-xs text-muted-foreground">
              {row.original.city ?? "—"} · {row.original.reference_code}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "owner_email",
        header: "Sahip",
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate text-sm">{row.original.owner_name ?? "—"}</div>
            <div className="truncate text-xs text-muted-foreground">
              {row.original.owner_email ?? "—"}
            </div>
          </div>
        ),
      },
      {
        id: "durum",
        header: "Durum",
        // Sıralama bitiş tarihine göre: durum etiketi alfabetik sıralanırsa
        // "süresi dolmak üzere" olanlar listenin ortasında kaybolur.
        accessorFn: (row) => row.access_until,
        cell: ({ row }) => {
          const bilgi = subscriptionInfo(row.original);
          return (
            <div className="flex flex-col gap-1">
              <Badge variant="outline" className={DURUM_STIL[bilgi.state]}>
                {DURUM_ETIKET[bilgi.state]}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {bilgi.state === "sona_erdi"
                  ? formatDate(bilgi.accessUntil)
                  : `${formatDate(bilgi.accessUntil)} · ${
                      bilgi.daysLeft === 0 ? "bugün son gün" : `${bilgi.daysLeft} gün`
                    }`}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "created_at",
        header: "Kayıt",
        cell: ({ row }) => (
          <span className="text-sm whitespace-nowrap">
            {formatDate(row.original.created_at)}
          </span>
        ),
      },
      {
        id: "kullanim",
        header: "Kullanım",
        // Salon sayısına göre sıralanıyor: bedel ondan hesaplandığı için
        // listede en pahalı/en büyük müşteriyi bulmak isteniyor.
        accessorFn: (row) => row.venue_count,
        cell: ({ row }) => (
          <span className="text-sm whitespace-nowrap text-muted-foreground">
            <span className="font-medium text-foreground">
              {row.original.venue_count} salon
            </span>{" "}
            · {row.original.reservation_count} rezervasyon ·{" "}
            {row.original.user_count} kullanıcı
          </span>
        ),
      },
      {
        accessorKey: "note",
        header: "Not",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.note ?? "—"}
          </span>
        ),
      },
      {
        id: "aksiyon",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <ExtendAccessDialog
              row={row.original}
              triggerButton={{ label: "Süre uzat", variant: "outline", size: "sm" }}
            />
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      searchPlaceholder="İşletme, sahip veya kod ara"
      empty={
        <EmptyState
          icon={Building2}
          title="Henüz işletme yok"
          description="Kayıt olan ilk işletme burada görünecek."
        />
      }
    />
  );
}
