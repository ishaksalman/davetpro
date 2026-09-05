"use client";

import { useState } from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type DataTableProps<TData> = {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  /** Arama kutusu için ipucu metni; verilmezse arama gizlenir. */
  searchPlaceholder?: string;
  /** Sağ üstteki filtre alanı (durum, salon vb. seçiciler). */
  toolbar?: React.ReactNode;
  /** Hiç kayıt yokken gösterilecek içerik (filtre sonucu boş kalması dahil değil). */
  empty?: React.ReactNode;
  /** Filtreleme bileşen dışında yapılıyorsa ham kayıt sayısı. */
  totalCount?: number;
  pageSize?: number;
  onRowClick?: (row: TData) => void;
  /** Satırın altını çizen ek sınıflar (ör. iptal edilmiş kaydı soluklaştırma). */
  rowClassName?: (row: TData) => string | undefined;
};

export function DataTable<TData>({
  columns,
  data,
  searchPlaceholder,
  toolbar,
  empty,
  totalCount,
  pageSize = 25,
  onRowClick,
  rowClassName,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: turkishIncludes,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  const rows = table.getRowModel().rows;
  const totalRows = table.getFilteredRowModel().rows.length;
  const { pageIndex } = table.getState().pagination;

  // Hiç veri yokken tabloyu değil, boş durumu göster. Filtreler yüzünden boş
  // kalan liste bu duruma girmez — kullanıcı filtresini görebilmeli.
  if ((totalCount ?? data.length) === 0 && empty) return <>{empty}</>;

  return (
    <div className="space-y-3">
      {(searchPlaceholder || toolbar) && (
        <div className="flex flex-wrap items-center gap-2">
          {searchPlaceholder && (
            <div className="relative min-w-56 flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder={searchPlaceholder}
                className="pl-9"
                aria-label={searchPlaceholder}
              />
            </div>
          )}
          {toolbar && (
            <div className="flex flex-wrap items-center gap-2">{toolbar}</div>
          )}
        </div>
      )}

      {/* Başlık, tablonun KENDİ kaydırma kabına yapışıyor.
          Sayfa kaydırmasına yapıştırmak mümkün değil: yatay kaydırma için
          gereken overflow-x-auto, CSS gereği dikey ekseni de kaydırma bağlamı
          yapıyor ve sticky o kutuya hapsoluyor. Bu yüzden tabloya sınırlı bir
          yükseklik verip başlığı oraya sabitliyoruz — kısa tablolarda kaydırma
          çubuğu hiç çıkmıyor, görünüm değişmiyor. */}
      <div className="overflow-clip rounded-xl border bg-card">
          <Table containerClassName="max-h-[calc(100svh-13rem)]">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => {
                    const sortable = header.column.getCanSort();
                    const sorted = header.column.getIsSorted();
                    return (
                      <TableHead
                        key={header.id}
                        // top-16: yapışkan sayfa başlığının (min-h-16) hemen altı.
                        // Alt çizgi inset gölge ile veriliyor ki hücreyle
                        // birlikte hareket etsin.
                        className="sticky top-0 z-10 h-11 bg-card text-xs font-medium tracking-wide text-muted-foreground uppercase shadow-[inset_0_-1px_0_var(--border)]"
                      >
                        {header.isPlaceholder ? null : sortable ? (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className="-mx-1 flex items-center gap-1 rounded px-1 hover:text-foreground"
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                            {sorted === "asc" ? (
                              <ArrowUp className="size-3.5" />
                            ) : sorted === "desc" ? (
                              <ArrowDown className="size-3.5" />
                            ) : (
                              <ChevronsUpDown className="size-3.5 opacity-40" />
                            )}
                          </button>
                        ) : (
                          flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={columns.length}
                    className="h-28 text-center text-sm text-muted-foreground"
                  >
                    Bu filtrelerle eşleşen kayıt bulunamadı.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow
                    key={row.id}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                    className={cn(
                      onRowClick && "cursor-pointer",
                      rowClassName?.(row.original),
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
      </div>

      {totalRows > table.getState().pagination.pageSize && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <p>
            {totalRows} kayıttan{" "}
            <span className="text-foreground">
              {pageIndex * table.getState().pagination.pageSize + 1}–
              {Math.min(
                (pageIndex + 1) * table.getState().pagination.pageSize,
                totalRows,
              )}
            </span>{" "}
            arası gösteriliyor
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Önceki
            </Button>
            <span className="tabular">
              {pageIndex + 1} / {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Sonraki
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Türkçe'ye duyarlı arama: "İ/ı" ve "I/i" eşleşmesi İngilizce toLowerCase ile
 * bozulduğu için localeCompare tabanlı normalizasyon kullanılır.
 */
function turkishIncludes(
  row: { getValue: (id: string) => unknown },
  columnId: string,
  filterValue: string,
): boolean {
  const value = row.getValue(columnId);
  if (value == null) return false;
  return normalize(String(value)).includes(normalize(filterValue));
}

function normalize(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .trim();
}
