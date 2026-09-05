"use client";

import { MoreHorizontal, Pencil, Store, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { formatNumber } from "@/lib/format";
import type { Venue } from "@/lib/database.types";
import { VENUE_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { deleteVenue } from "./actions";
import { VenueFormDialog } from "./venue-form-dialog";

export function VenueList({ venues }: { venues: Venue[] }) {
  if (venues.length === 0) {
    return (
      <EmptyState
        icon={Store}
        title="Henüz salon eklemediniz"
        description="Rezervasyon oluşturabilmek için en az bir salon tanımlamanız gerekiyor."
        action={
          <VenueFormDialog triggerButton={{ label: "İlk salonunuzu ekleyin" }} />
        }
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {venues.map((venue, index) => (
        <article
          key={venue.id}
          className={cn(
            "group relative overflow-hidden rounded-xl border bg-card p-5 transition-shadow hover:shadow-sm",
            !venue.is_active && "opacity-60",
          )}
        >
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-1"
            style={{ backgroundColor: venue.color }}
          />

          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-medium">{venue.name}</h3>
              {venue.capacity && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Users className="size-3.5" />
                  {formatNumber(venue.capacity)} kişi
                </p>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="-mt-1 -mr-2 shrink-0">
                  <MoreHorizontal />
                  <span className="sr-only">Salon işlemleri</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <VenueFormDialog
                  venue={venue}
                  suggestedColor={VENUE_COLORS[index % VENUE_COLORS.length]}
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Pencil />
                      Düzenle
                    </DropdownMenuItem>
                  }
                />
                <ConfirmDialog
                  title="Salon silinsin mi?"
                  description={
                    <>
                      <strong>{venue.name}</strong> kalıcı olarak silinecek. Bu salona
                      bağlı rezervasyon varsa silme işlemi yapılamaz — bunun yerine
                      salonu pasife alabilirsiniz.
                    </>
                  }
                  confirmLabel="Sil"
                  successMessage="Salon silindi."
                  onConfirm={() => deleteVenue(venue.id)}
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

          {venue.description && (
            <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
              {venue.description}
            </p>
          )}

          {!venue.is_active && (
            <span className="mt-3 inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              Pasif
            </span>
          )}
        </article>
      ))}
    </div>
  );
}
