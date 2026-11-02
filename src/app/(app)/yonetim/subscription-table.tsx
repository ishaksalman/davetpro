"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Building2 } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { WhatsAppButton } from "@/components/shared/whatsapp-button";
import { formatDate, formatPhone } from "@/lib/format";
import { subscriptionInfo, type SubscriptionState } from "@/lib/subscription";
import type { AdminBusinessRow } from "@/lib/database.types";
import { cn } from "@/lib/utils";
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

/** Arama yanındaki sekmeler: aciliyet sırasıyla, renkleri rozetlerle aynı. */
const SEKMELER: { durum: SubscriptionState; nokta: string }[] = [
  { durum: "sona_erdi", nokta: "bg-rose-500" },
  { durum: "deneme", nokta: "bg-amber-400" },
  { durum: "abone", nokta: "bg-emerald-500" },
];

export function SubscriptionTable({ rows }: { rows: AdminBusinessRow[] }) {
  // null = hepsi. Seçili sekmeye yeniden basmak filtreyi kaldırıyor.
  const [secili, setSecili] = useState<SubscriptionState | null>(null);

  const durumlar = useMemo(
    () => new Map(rows.map((r) => [r.business_id, subscriptionInfo(r).state])),
    [rows],
  );
  const sayilar = useMemo(() => {
    const c: Record<SubscriptionState, number> = { sona_erdi: 0, deneme: 0, abone: 0 };
    for (const d of durumlar.values()) c[d] += 1;
    return c;
  }, [durumlar]);
  const gorunen = useMemo(
    () => (secili ? rows.filter((r) => durumlar.get(r.business_id) === secili) : rows),
    [rows, durumlar, secili],
  );

  const columns = useMemo<ColumnDef<AdminBusinessRow, unknown>[]>(
    () => [
      {
        accessorKey: "business_name",
        header: "İşletme",
        // Tek satır: şehir ve ödeme kodu adın yanında. Ad uzunsa kesiliyor,
        // tamamı ipucunda.
        cell: ({ row }) => (
          <div
            className="flex max-w-72 items-baseline gap-1.5"
            title={row.original.business_name}
          >
            <span className="truncate font-medium">{row.original.business_name}</span>
            <span className="shrink-0 text-xs whitespace-nowrap text-muted-foreground">
              {row.original.city ? `${row.original.city} · ` : ""}
              <span className="font-mono">{row.original.reference_code}</span>
            </span>
          </div>
        ),
      },
      {
        accessorKey: "owner_email",
        header: "Sahip",
        cell: ({ row }) => (
          <div
            className="flex max-w-64 items-baseline gap-1.5"
            title={row.original.owner_email ?? undefined}
          >
            <span className="shrink-0 text-sm whitespace-nowrap">
              {row.original.owner_name ?? "—"}
            </span>
            {row.original.owner_email && (
              <a
                href={`mailto:${row.original.owner_email}`}
                className="truncate text-xs text-muted-foreground hover:underline"
              >
                {row.original.owner_email}
              </a>
            )}
          </div>
        ),
      },
      {
        accessorKey: "business_phone",
        header: "Telefon",
        enableSorting: false,
        cell: ({ row }) => {
          const tel = row.original.business_phone;
          if (!tel) return <span className="text-sm text-muted-foreground">—</span>;
          return (
            <div className="flex items-center gap-0.5">
              <a
                href={`tel:${tel.replace(/[^\d+]/g, "")}`}
                className="tabular text-sm whitespace-nowrap hover:underline"
              >
                {formatPhone(tel)}
              </a>
              <WhatsAppButton
                phone={tel}
                message={`Merhaba ${row.original.owner_name ?? row.original.business_name},`}
                className="size-7"
              />
            </div>
          );
        },
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
            <div className="flex items-center gap-2 whitespace-nowrap">
              <Badge variant="outline" className={DURUM_STIL[bilgi.state]}>
                {DURUM_ETIKET[bilgi.state]}
              </Badge>
              <span
                className="text-xs text-muted-foreground"
                title={`Bitiş: ${formatDate(bilgi.accessUntil)}`}
              >
                {bilgi.state === "sona_erdi"
                  ? formatDate(bilgi.accessUntil)
                  : bilgi.daysLeft === 0
                    ? "bugün son gün"
                    : `${bilgi.daysLeft} gün`}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "created_at",
        header: "Kayıt",
        cell: ({ row }) => (
          <span className="tabular text-sm whitespace-nowrap">
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
          <span
            className="tabular text-sm whitespace-nowrap text-muted-foreground"
            title={`${row.original.venue_count} salon · ${row.original.reservation_count} rezervasyon · ${row.original.user_count} kullanıcı`}
          >
            <span className="font-medium text-foreground">{row.original.venue_count} salon</span>
            {" · "}
            {row.original.reservation_count} rez. · {row.original.user_count} kişi
          </span>
        ),
      },
      {
        accessorKey: "note",
        header: "Not",
        cell: ({ row }) => (
          <div
            className="max-w-48 truncate text-xs text-muted-foreground"
            title={row.original.note ?? undefined}
          >
            {row.original.note ?? "—"}
          </div>
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
              triggerButton={{ label: "Süre uzat", variant: "outline", size: "xs" }}
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
      data={gorunen}
      totalCount={rows.length}
      searchPlaceholder="İşletme, sahip veya kod ara"
      toolbar={
        <div
          role="group"
          aria-label="Duruma göre süz"
          className="flex items-center gap-0.5 rounded-lg border bg-card p-0.5"
        >
          {SEKMELER.map(({ durum, nokta }) => (
            <button
              key={durum}
              type="button"
              aria-pressed={secili === durum}
              title={DURUM_ETIKET[durum]}
              onClick={() => setSecili((s) => (s === durum ? null : durum))}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
                secili === durum && "bg-muted font-medium text-foreground",
              )}
            >
              <span className={cn("size-2.5 rounded-full", nokta)} aria-hidden />
              <span className="sr-only">{DURUM_ETIKET[durum]}</span>
              <span className="tabular">{sayilar[durum]}</span>
            </button>
          ))}
        </div>
      }
      dense
      pageSize={100}
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
