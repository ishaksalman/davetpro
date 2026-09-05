"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Ban, MoreHorizontal, Wallet } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Money } from "@/components/shared/money";
import { VoidDialog } from "@/components/shared/void-dialog";
import {
  enumOptions,
  INCOME_CATEGORY_LABELS,
  PAYMENT_METHOD_LABELS,
} from "@/lib/constants";
import { formatDateShort } from "@/lib/format";
import type { IncomeCategory, Payment, PaymentMethod } from "@/lib/database.types";
import type { ReservationRow } from "@/lib/queries";
import { voidPayment } from "./actions";
import { PaymentFormDialog } from "./payment-form-dialog";

export type PaymentRow = Payment & {
  customer_name: string | null;
  reservation_label: string | null;
};

export function PaymentTable({
  payments,
  reservations,
}: {
  payments: PaymentRow[];
  reservations: ReservationRow[];
}) {
  const [method, setMethod] = useState<PaymentMethod | "all">("all");
  const [category, setCategory] = useState<IncomeCategory | "all">("all");
  const [showVoided, setShowVoided] = useState(false);

  const filtered = useMemo(
    () =>
      payments.filter((p) => {
        if (!showVoided && p.voided_at) return false;
        if (method !== "all" && p.method !== method) return false;
        if (category !== "all" && p.category !== category) return false;
        return true;
      }),
    [payments, method, category, showVoided],
  );

  const columns = useMemo<ColumnDef<PaymentRow, unknown>[]>(
    () => [
      {
        accessorKey: "payment_date",
        header: "Tarih",
        cell: ({ row }) => (
          <span className="tabular whitespace-nowrap">
            {formatDateShort(row.original.payment_date)}
          </span>
        ),
      },
      {
        id: "customer",
        header: "Müşteri",
        accessorFn: (row) => row.customer_name ?? "",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{row.original.customer_name ?? "—"}</p>
            {row.original.reservation_id && (
              <Link
                href={`/rezervasyonlar/${row.original.reservation_id}`}
                className="truncate text-xs text-muted-foreground hover:underline"
              >
                {row.original.reservation_label}
              </Link>
            )}
          </div>
        ),
      },
      {
        accessorKey: "category",
        header: "Kategori",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {INCOME_CATEGORY_LABELS[row.original.category]}
          </span>
        ),
      },
      {
        accessorKey: "method",
        header: "Yöntem",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {PAYMENT_METHOD_LABELS[row.original.method]}
          </span>
        ),
      },
      {
        accessorKey: "description",
        header: "Açıklama",
        cell: ({ row }) => (
          <span className="line-clamp-1 text-muted-foreground">
            {row.original.description ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "amount",
        header: "Tutar",
        cell: ({ row }) =>
          row.original.voided_at ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="tabular whitespace-nowrap text-muted-foreground line-through">
                  <Money value={row.original.amount} tone="muted" />
                </span>
              </TooltipTrigger>
              <TooltipContent>İptal nedeni: {row.original.void_reason}</TooltipContent>
            </Tooltip>
          ) : (
            <Money value={row.original.amount} tone="positive" />
          ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.voided_at ? null : (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal />
                    <span className="sr-only">Tahsilat işlemleri</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <VoidDialog
                    title="Tahsilat iptal edilsin mi?"
                    description="Kayıt silinmez; iptal edilmiş olarak işaretlenir ve bakiyeden düşülür. Doğru tutarı yeni bir kayıt olarak girebilirsiniz."
                    onVoid={(reason) => voidPayment(row.original.id, reason)}
                    successMessage="Tahsilat iptal edildi."
                    trigger={
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={(e) => e.preventDefault()}
                      >
                        <Ban />
                        İptal et
                      </DropdownMenuItem>
                    }
                  />
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ),
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      data={filtered}
      totalCount={payments.length}
      searchPlaceholder="Müşteri veya açıklama ara…"
      rowClassName={(row) => (row.voided_at ? "opacity-55" : undefined)}
      toolbar={
        <>
          <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
            <SelectTrigger className="w-40" aria-label="Kategori filtresi">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm kategoriler</SelectItem>
              {enumOptions(INCOME_CATEGORY_LABELS).map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
            <SelectTrigger className="w-40" aria-label="Ödeme yöntemi filtresi">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm yöntemler</SelectItem>
              {enumOptions(PAYMENT_METHOD_LABELS).map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant={showVoided ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowVoided((v) => !v)}
          >
            İptal edilenler
          </Button>
        </>
      }
      empty={
        <EmptyState
          icon={Wallet}
          title="Bu dönemde tahsilat kaydı yok"
          description="Rezervasyonlara girdiğiniz ödemeler otomatik olarak buraya düşer. Manuel gelir de ekleyebilirsiniz."
          action={
            <PaymentFormDialog
              reservations={reservations}
              triggerButton={{ label: "Tahsilat ekle", icon: "plus" }}
            />
          }
        />
      }
    />
  );
}
