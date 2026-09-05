"use client";

import {
  Check,
  MoreHorizontal,
  Package as PackageIcon,
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
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { formatMoney } from "@/lib/format";
import type { Package, Venue } from "@/lib/database.types";
import { cn } from "@/lib/utils";
import { deletePackage } from "./actions";
import { PackageFormDialog } from "./package-form-dialog";

export function PackageList({
  packages,
  venues,
}: {
  packages: Package[];
  venues: Venue[];
}) {
  const venueName = new Map(venues.map((v) => [v.id, v.name] as const));
  if (packages.length === 0) {
    return (
      <EmptyState
        icon={PackageIcon}
        title="Henüz paket tanımlamadınız"
        description="Paketler, rezervasyon oluştururken fiyatı otomatik doldurur. Zorunlu değildir ama işinizi hızlandırır."
        action={
          <PackageFormDialog
            venues={venues}
            triggerButton={{ label: "İlk paketinizi ekleyin" }}
          />
        }
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {packages.map((pkg) => (
        <article
          key={pkg.id}
          className={cn(
            "flex flex-col rounded-xl border bg-card p-5 transition-shadow hover:shadow-sm",
            !pkg.is_active && "opacity-60",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-medium">{pkg.name}</h3>
              <p className="mt-1 text-2xl font-semibold tracking-tight tabular">
                {formatMoney(pkg.base_price)}
                {pkg.pricing_type === "kisi_basi" && (
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    / kişi
                  </span>
                )}
              </p>
              {/* Yalnızca bir salona ait paketlerde gösteriliyor; tüm
                  salonlarda geçerli olanlarda söylenecek bir şey yok. */}
              {pkg.venue_id && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {venueName.get(pkg.venue_id) ?? "Silinmiş salon"}
                </p>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="-mt-1 -mr-2 shrink-0"
                >
                  <MoreHorizontal />
                  <span className="sr-only">Paket işlemleri</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <PackageFormDialog
                  pkg={pkg}
                  venues={venues}
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Pencil />
                      Düzenle
                    </DropdownMenuItem>
                  }
                />
                <ConfirmDialog
                  title="Paket silinsin mi?"
                  description={
                    <>
                      <strong>{pkg.name}</strong> silinecek. Bu pakete bağlı
                      geçmiş rezervasyonların fiyatları etkilenmez; yalnızca
                      paket bağlantısı kaldırılır.
                    </>
                  }
                  confirmLabel="Sil"
                  successMessage="Paket silindi."
                  onConfirm={() => deletePackage(pkg.id)}
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

          {pkg.description && (
            <p className="mt-3 text-sm text-muted-foreground">
              {pkg.description}
            </p>
          )}

          {pkg.included_services.length > 0 && (
            <ul className="mt-4 space-y-1.5 border-t pt-4 text-sm">
              {pkg.included_services.map((service) => (
                <li key={service} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
                  {service}
                </li>
              ))}
            </ul>
          )}

          {!pkg.is_active && (
            <span className="mt-4 inline-flex w-fit rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              Pasif
            </span>
          )}
        </article>
      ))}
    </div>
  );
}
