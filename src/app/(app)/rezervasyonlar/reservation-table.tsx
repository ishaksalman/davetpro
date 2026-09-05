"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import {
  CalendarPlus,
  CircleAlert,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Money } from "@/components/shared/money";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  ORGANIZATION_TYPE_LABELS,
  RESERVATION_STATUS_FLOW,
  RESERVATION_STATUS_LABELS,
} from "@/lib/constants";
import { formatDateShort, formatNumber, formatTimeRange } from "@/lib/format";
import type {
  Customer,
  Package,
  ReservationStatus,
  Venue,
} from "@/lib/database.types";
import { cn } from "@/lib/utils";
import type { ReservationRow } from "@/lib/queries";
import { todayISO } from "@/lib/time";
import { deleteReservation } from "./actions";
import { ReservationFormDialog } from "./reservation-form-dialog";

type TimeFilter = "upcoming" | "past" | "all";

export function ReservationTable({
  reservations,
  customers,
  venues,
  packages,
  showFinance,
  canDelete,
}: {
  reservations: ReservationRow[];
  customers: Customer[];
  venues: Venue[];
  packages: Package[];
  showFinance: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<ReservationStatus | "all">("all");
  const [venueId, setVenueId] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("upcoming");

  const today = todayISO();

  // Zaman dışındaki filtreler önce uygulanır; böylece zaman seçeneklerinin
  // yanındaki sayılar, seçildiklerinde gerçekten görülecek satır sayısını verir.
  const byOtherFilters = useMemo(
    () =>
      reservations.filter((r) => {
        if (status !== "all" && r.status !== status) return false;
        if (venueId !== "all" && r.venue_id !== venueId) return false;
        return true;
      }),
    [reservations, status, venueId],
  );

  const counts = useMemo(
    () => ({
      upcoming: byOtherFilters.filter((r) => r.event_date >= today).length,
      past: byOtherFilters.filter((r) => r.event_date < today).length,
      all: byOtherFilters.length,
    }),
    [byOtherFilters, today],
  );

  const filtered = useMemo(
    () =>
      byOtherFilters.filter((r) => {
        if (timeFilter === "upcoming") return r.event_date >= today;
        if (timeFilter === "past") return r.event_date < today;
        return true;
      }),
    [byOtherFilters, timeFilter, today],
  );

  const columns = useMemo<ColumnDef<ReservationRow, unknown>[]>(() => {
    const base: ColumnDef<ReservationRow, unknown>[] = [
      {
        accessorKey: "event_date",
        header: "Tarih",
        cell: ({ row }) => (
          <div className="whitespace-nowrap">
            <p className="font-medium tabular">{formatDateShort(row.original.event_date)}</p>
            <p className="text-xs text-muted-foreground tabular">
              {formatTimeRange(row.original.start_time, row.original.end_time)}
            </p>
          </div>
        ),
      },
      {
        id: "customer",
        header: "Müşteri",
        accessorFn: (row) => row.customer?.full_name ?? "",
        cell: ({ row }) => (
          <span className="font-medium whitespace-nowrap">
            {row.original.customer?.full_name ?? "—"}
          </span>
        ),
      },
      {
        id: "venue",
        header: "Salon",
        accessorFn: (row) => row.venue?.name ?? "",
        cell: ({ row }) => (
          <span className="flex items-center gap-2 whitespace-nowrap">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: row.original.venue?.color }}
            />
            {row.original.venue?.name ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "organization_type",
        header: "Tür",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {ORGANIZATION_TYPE_LABELS[row.original.organization_type]}
            {row.original.guest_count
              ? ` · ${formatNumber(row.original.guest_count)} kişi`
              : ""}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Durum",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    ];

    if (showFinance) {
      base.push(
        {
          accessorKey: "net_amount",
          header: "Net satış",
          cell: ({ row }) => <Money value={row.original.net_amount} />,
        },
        {
          accessorKey: "collected_amount",
          header: "Tahsil edilen",
          cell: ({ row }) => {
            // Arkasında para olmayan rezervasyon takvimi bloke ediyor; soluk
            // bir ₺0 bunu anlatmıyordu. İptal edilende anlamsız olduğu için
            // orada rozet çıkmıyor.
            if (
              row.original.collected_amount === 0 &&
              row.original.status !== "iptal_edildi"
            ) {
              return (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-1 text-xs font-medium whitespace-nowrap text-amber-700 dark:text-amber-400">
                  <CircleAlert className="size-3.5" />
                  Kapora alınmadı
                </span>
              );
            }
            return (
              <Money value={row.original.collected_amount} tone="positive" />
            );
          },
        },
        {
          accessorKey: "balance_amount",
          header: "Kalan",
          cell: ({ row }) => (
            <Money
              value={row.original.balance_amount}
              tone={row.original.balance_amount > 0 ? "pending" : "muted"}
            />
          ),
        },
      );
    }

    base.push({
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal />
                <span className="sr-only">Rezervasyon işlemleri</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <ReservationFormDialog
                reservation={row.original}
                customers={customers}
                venues={venues}
                packages={packages}
                showFinance={showFinance}
                trigger={
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Pencil />
                    Düzenle
                  </DropdownMenuItem>
                }
              />
              {canDelete && (
                <ConfirmDialog
                  title="Rezervasyon silinsin mi?"
                  description="Bu rezervasyona bağlı tahsilat veya gider varsa silme işlemi yapılamaz. Bu durumda rezervasyonu 'İptal edildi' durumuna almanız daha doğrudur."
                  confirmLabel="Sil"
                  successMessage="Rezervasyon silindi."
                  onConfirm={() => deleteReservation(row.original.id)}
                  trigger={
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={(e) => e.preventDefault()}
                    >
                      <Trash2 />
                      Sil
                    </DropdownMenuItem>
                  }
                />
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    });

    return base;
  }, [showFinance, canDelete, customers, venues, packages]);

  return (
    <DataTable
      columns={columns}
      data={filtered}
      totalCount={reservations.length}
      searchPlaceholder="Müşteri veya salon ara…"
      onRowClick={(row) => router.push(`/rezervasyonlar/${row.id}`)}
      rowClassName={(row) =>
        cn(row.status === "iptal_edildi" && "text-muted-foreground line-through")
      }
      toolbar={
        <>
          <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
            <SelectTrigger className="w-44" aria-label="Zaman filtresi">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="upcoming">Yaklaşanlar ({counts.upcoming})</SelectItem>
              <SelectItem value="past">Geçmiş ({counts.past})</SelectItem>
              <SelectItem value="all">Tümü ({counts.all})</SelectItem>
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="w-40" aria-label="Durum filtresi">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm durumlar</SelectItem>
              {RESERVATION_STATUS_FLOW.map((v) => ({ value: v, label: RESERVATION_STATUS_LABELS[v] })).map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {venues.length > 1 && (
            <Select value={venueId} onValueChange={setVenueId}>
              <SelectTrigger className="w-40" aria-label="Salon filtresi">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm salonlar</SelectItem>
                {venues.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </>
      }
      empty={
        <EmptyState
          icon={CalendarPlus}
          title="Henüz rezervasyon yok"
          description="İlk rezervasyonunuzu oluşturun; takvim ve finans ekranları buradan beslenir."
          action={
            <ReservationFormDialog
              customers={customers}
              venues={venues}
              packages={packages}
              showFinance={showFinance}
              triggerButton={{ label: "Rezervasyon oluştur" }}
            />
          }
        />
      }
    />
  );
}
