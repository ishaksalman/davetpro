"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Money } from "@/components/shared/money";
import { WhatsAppButton } from "@/components/shared/whatsapp-button";
import { formatDateShort, formatPhone, initials } from "@/lib/format";
import type { Customer, CustomerBalance } from "@/lib/database.types";
import { deleteCustomer } from "./actions";
import { CustomerFormDialog } from "./customer-form-dialog";

export type CustomerRow = Customer & {
  balance: CustomerBalance | undefined;
};

export function CustomerTable({
  customers,
  showFinance,
}: {
  customers: CustomerRow[];
  showFinance: boolean;
}) {
  const router = useRouter();

  const columns = useMemo<ColumnDef<CustomerRow, unknown>[]>(() => {
    const base: ColumnDef<CustomerRow, unknown>[] = [
      {
        accessorKey: "full_name",
        header: "Müşteri",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-medium text-primary">
              {initials(row.original.full_name)}
            </span>
            <div className="min-w-0">
              <Link
                href={`/musteriler/${row.original.id}`}
                className="font-medium hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {row.original.full_name}
              </Link>
              {row.original.email && (
                <p className="truncate text-xs text-muted-foreground">
                  {row.original.email}
                </p>
              )}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "phone",
        header: "Telefon",
        cell: ({ row }) => (
          <div
            className="flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <a
              href={`tel:${row.original.phone}`}
              className="tabular whitespace-nowrap hover:underline"
            >
              {formatPhone(row.original.phone)}
            </a>
            <WhatsAppButton
              phone={row.original.phone}
              message={`Merhaba ${row.original.full_name},`}
            />
          </div>
        ),
      },
      {
        id: "reservation_count",
        header: "Organizasyon",
        accessorFn: (row) => row.balance?.reservation_count ?? 0,
        cell: ({ getValue, row }) => (
          <div className="tabular">
            <span>{String(getValue() ?? 0)}</span>
            {row.original.balance?.last_event_date && (
              <p className="text-xs text-muted-foreground">
                Son: {formatDateShort(row.original.balance.last_event_date)}
              </p>
            )}
          </div>
        ),
      },
    ];

    if (showFinance) {
      base.push(
        {
          id: "total_sales",
          header: "Toplam satış",
          accessorFn: (row) => row.balance?.total_sales ?? 0,
          cell: ({ getValue }) => <Money value={getValue() as number} />,
        },
        {
          id: "total_balance",
          header: "Kalan borç",
          accessorFn: (row) => row.balance?.total_balance ?? 0,
          cell: ({ getValue }) => {
            const value = getValue() as number;
            return <Money value={value} tone={value > 0 ? "pending" : "muted"} />;
          },
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
                <span className="sr-only">Müşteri işlemleri</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <CustomerFormDialog
                customer={row.original}
                trigger={
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Pencil />
                    Düzenle
                  </DropdownMenuItem>
                }
              />
              <ConfirmDialog
                title="Müşteri silinsin mi?"
                description={
                  <>
                    <strong>{row.original.full_name}</strong> silinecek. Müşterinin
                    rezervasyonu varsa silme işlemi yapılamaz.
                  </>
                }
                confirmLabel="Sil"
                successMessage="Müşteri silindi."
                onConfirm={() => deleteCustomer(row.original.id)}
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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    });

    return base;
  }, [showFinance]);

  return (
    <DataTable
      columns={columns}
      data={customers}
      searchPlaceholder="Ad veya telefona göre ara…"
      onRowClick={(row) => router.push(`/musteriler/${row.id}`)}
      empty={
        <EmptyState
          icon={Users}
          title="Henüz müşteri kaydı yok"
          description="Müşterileri buradan ekleyebilir veya rezervasyon oluştururken doğrudan tanımlayabilirsiniz."
          action={
            <CustomerFormDialog
              triggerButton={{ label: "İlk müşterinizi ekleyin", icon: "plus" }}
            />
          }
        />
      }
    />
  );
}
