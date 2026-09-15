"use client";

import { MoreHorizontal, Pencil, Phone, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { formatPhone } from "@/lib/format";
import type { Team } from "@/lib/database.types";
import { VENUE_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { deleteTeam } from "./actions";
import { TeamFormDialog } from "./team-form-dialog";

export function TeamList({ teams }: { teams: Team[] }) {
  if (teams.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Henüz ekip eklenmemiş"
        description="Ekip zorunlu değil — çekimleri ekip atamadan da kaydedebilirsiniz. Kimin hangi işe gittiğini takip etmek isterseniz buradan tanımlayın."
        action={<TeamFormDialog triggerButton={{ label: "İlk ekibinizi ekleyin" }} />}
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {teams.map((team, index) => (
        <article
          key={team.id}
          className={cn(
            "group relative overflow-hidden rounded-xl border bg-card p-5 transition-shadow hover:shadow-sm",
            !team.is_active && "opacity-60",
          )}
        >
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-1"
            style={{ backgroundColor: team.color }}
          />

          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-medium">{team.name}</h3>
              {team.members && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Users className="size-3.5 shrink-0" />
                  <span className="truncate">{team.members}</span>
                </p>
              )}
              {team.phone && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Phone className="size-3.5 shrink-0" />
                  {formatPhone(team.phone)}
                </p>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="-mt-1 -mr-2 shrink-0">
                  <MoreHorizontal />
                  <span className="sr-only">Ekip işlemleri</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <TeamFormDialog
                  team={team}
                  suggestedColor={VENUE_COLORS[index % VENUE_COLORS.length]}
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Pencil />
                      Düzenle
                    </DropdownMenuItem>
                  }
                />
                <ConfirmDialog
                  title="Ekip silinsin mi?"
                  description={
                    <>
                      <strong>{team.name}</strong> kalıcı olarak silinecek. Bu ekibin
                      atandığı çekimler <strong>silinmez</strong>; yalnızca ekip ataması
                      boşalır.
                    </>
                  }
                  confirmLabel="Sil"
                  successMessage="Ekip silindi."
                  onConfirm={() => deleteTeam(team.id)}
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

          {team.note && (
            <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{team.note}</p>
          )}

          {!team.is_active && (
            <span className="mt-3 inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              Pasif
            </span>
          )}
        </article>
      ))}
    </div>
  );
}
