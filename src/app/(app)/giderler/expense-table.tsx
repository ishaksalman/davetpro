"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Ban, MoreHorizontal, Receipt } from "lucide-react";
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
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { formatDateShort } from "@/lib/format";
import type { Expense, ExpenseCategory } from "@/lib/database.types";
import type { ReservationRow } from "@/lib/queries";
import { voidExpense } from "./actions";
import { ExpenseFormDialog } from "./expense-form-dialog";

export type ExpenseRow = Expense & {
  category_name: string;
  reservation_label: string | null;
};

export function ExpenseTable({
  expenses,
  categories,
  reservations,
}: {
  expenses: ExpenseRow[];
  categories: ExpenseCategory[];
  reservations: ReservationRow[];
}) {
  const [categoryId, setCategoryId] = useState("all");
  const [linkage, setLinkage] = useState<"all" | "linked" | "general">("all");
  const [showVoided, setShowVoided] = useState(false);

  const filtered = useMemo(
    () =>
      expenses.filter((e) => {
        if (!showVoided && e.voided_at) return false;
        if (categoryId !== "all" && e.category_id !== categoryId) return false;
        if (linkage === "linked" && !e.reservation_id) return false;
        if (linkage === "general" && e.reservation_id) return false;
        return true;
      }),
    [expenses, categoryId, linkage, showVoided],
  );

  const columns = useMemo<ColumnDef<ExpenseRow, unknown>[]>(
    () => [
      {
        accessorKey: "expense_date",
        header: "Tarih",
        cell: ({ row }) => (
          <span className="tabular whitespace-nowrap">
            {formatDateShort(row.original.expense_date)}
          </span>
        ),
      },
      {
        accessorKey: "category_name",
        header: "Kategori",
        cell: ({ row }) => (
          <span className="whitespace-nowrap font-medium">
            {row.original.category_name}
          </span>
        ),
      },
      {
        accessorKey: "description",
        header: "Açıklama",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="line-clamp-1">{row.original.description ?? "—"}</p>
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
        accessorKey: "vendor",
        header: "Tedarikçi",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.vendor ?? "—"}</span>
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
        accessorKey: "amount",
        header: "Tutar",
        cell: ({ row }) =>
          row.original.voided_at ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="line-through">
                  <Money value={row.original.amount} tone="muted" />
                </span>
              </TooltipTrigger>
              <TooltipContent>İptal nedeni: {row.original.void_reason}</TooltipContent>
            </Tooltip>
          ) : (
            <Money value={row.original.amount} tone="negative" />
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
                    <span className="sr-only">Gider işlemleri</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <VoidDialog
                    title="Gider iptal edilsin mi?"
                    description="Kayıt silinmez; iptal edilmiş olarak işaretlenir ve kârlılık hesabından düşülür."
                    onVoid={(reason) => voidExpense(row.original.id, reason)}
                    successMessage="Gider iptal edildi."
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
      totalCount={expenses.length}
      searchPlaceholder="Açıklama veya tedarikçi ara…"
      rowClassName={(row) => (row.voided_at ? "opacity-55" : undefined)}
      toolbar={
        <>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="w-44" aria-label="Kategori filtresi">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm kategoriler</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={linkage} onValueChange={(v) => setLinkage(v as typeof linkage)}>
            <SelectTrigger className="w-44" aria-label="Bağlantı filtresi">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm giderler</SelectItem>
              <SelectItem value="linked">Organizasyona bağlı</SelectItem>
              <SelectItem value="general">Genel giderler</SelectItem>
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
          icon={Receipt}
          title="Bu dönemde gider kaydı yok"
          description="Personel, catering, dekorasyon gibi giderleri ekleyin; organizasyona bağladıklarınız kârlılık hesabına girer."
          action={
            <ExpenseFormDialog
              categories={categories}
              reservations={reservations}
              triggerButton={{ label: "Gider ekle", icon: "plus" }}
            />
          }
        />
      }
    />
  );
}
