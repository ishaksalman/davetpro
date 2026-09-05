"use client";

import { useState, useTransition } from "react";
import { CalendarClock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DatePicker } from "@/components/shared/date-picker";
import { HOLD_STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatDateTime, formatTimeRange } from "@/lib/format";
import { relativeDay } from "@/lib/relative-date";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import type { Venue, VenueHold } from "@/lib/database.types";
import { cancelHold, createHold, extendHold } from "../actions";

/**
 * Opsiyon paneli.
 *
 * Aktif opsiyon salonu bloke eder; süresi dolduğunda salon kendiliğinden
 * serbest kalır ve kayıt geçmişte durmaya devam eder.
 */
export function HoldPanel({
  leadId,
  holds,
  venues,
  defaults,
  locked,
}: {
  leadId: string;
  holds: VenueHold[];
  venues: Venue[];
  defaults: {
    venue_id: string | null;
    event_date: string | null;
    start_time: string | null;
    end_time: string | null;
  };
  locked: boolean;
}) {
  const active = holds.find((h) => h.status === "aktif");
  const past = holds.filter((h) => h.status !== "aktif");
  const venueNames = new Map(venues.map((v) => [v.id, v.name] as const));

  return (
    <section className="rounded-xl border bg-card p-5">
      <h2 className="font-medium">Opsiyon</h2>

      {active ? (
        <div className="mt-3 space-y-3">
          <div className="rounded-lg bg-orange-500/10 p-3 text-sm">
            <p className="font-medium">{venueNames.get(active.venue_id) ?? "—"}</p>
            <p className="text-muted-foreground">
              {formatDate(active.event_date)} ·{" "}
              {formatTimeRange(active.start_time, active.end_time)}
            </p>
            <p className="mt-1.5 text-orange-700 dark:text-orange-400">
              Opsiyon bitişi: {formatDateTime(active.expires_at)} (
              {relativeDay(active.expires_at)})
            </p>
          </div>

          {!locked && (
            <div className="flex flex-wrap gap-2">
              <ExtendHoldDialog holdId={active.id} leadId={leadId} />
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" size="sm" className="text-destructive">
                    Opsiyonu kaldır
                  </Button>
                }
                title="Opsiyonu kaldır"
                description="Tarih yeniden müsait hale gelir. Kayıt geçmişte kalmaya devam eder."
                confirmLabel="Kaldır"
                successMessage="Opsiyon kaldırıldı."
                onConfirm={() => cancelHold(active.id, leadId)}
              />
            </div>
          )}
        </div>
      ) : (
        <>
          <p className="mt-1 text-xs text-muted-foreground">
            Müşteri düşünürken tarihi tutmak için opsiyona alın. Talep ve teklif
            aşaması salonu bloke etmez.
          </p>
          {!locked && (
            <NewHoldDialog leadId={leadId} venues={venues} defaults={defaults} />
          )}
        </>
      )}

      {past.length > 0 && (
        <ul className="mt-4 space-y-2 border-t pt-3 text-xs text-muted-foreground">
          {past.map((hold) => (
            <li key={hold.id} className="flex items-center justify-between gap-2">
              <span>
                {formatDate(hold.event_date)} · {venueNames.get(hold.venue_id) ?? "—"}
              </span>
              <Badge variant="outline">{HOLD_STATUS_LABELS[hold.status]}</Badge>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function NewHoldDialog({
  leadId,
  venues,
  defaults,
}: {
  leadId: string;
  venues: Venue[];
  defaults: {
    venue_id: string | null;
    event_date: string | null;
    start_time: string | null;
    end_time: string | null;
  };
}) {
  const activeVenues = venues.filter((v) => v.is_active);
  const [open, setOpen] = useState(false);
  const [venueId, setVenueId] = useState(defaults.venue_id ?? activeVenues[0]?.id ?? "");
  const [date, setDate] = useState(defaults.event_date ?? "");
  const [start, setStart] = useState(defaults.start_time?.slice(0, 5) ?? "19:00");
  const [end, setEnd] = useState(defaults.end_time?.slice(0, 5) ?? "23:00");
  const [expires, setExpires] = useState(defaultExpiry());
  const [pending, startTransition] = useTransition();
  const guard = useSubmitGuard();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!venueId || !date) {
      toast.error("Salon ve tarih seçin.");
      return;
    }
    if (!guard.begin()) return;

    startTransition(async () => {
      try {
        const result = await createHold({
          lead_id: leadId,
          venue_id: venueId,
          event_date: date,
          start_time: start,
          end_time: end,
          expires_at: expires,
          note: "",
        });
        if (result.ok) {
          toast.success("Tarih opsiyona alındı.");
          setOpen(false);
        } else {
          toast.error(result.error);
        }
      } finally {
        guard.end();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="mt-3 w-full">
          <CalendarClock />
          Tarihi opsiyona al
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tarihi opsiyona al</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hold_venue">Salon</Label>
            <Select value={venueId} onValueChange={setVenueId}>
              <SelectTrigger id="hold_venue" className="w-full">
                <SelectValue placeholder="Salon seçin" />
              </SelectTrigger>
              <SelectContent>
                {activeVenues.map((venue) => (
                  <SelectItem key={venue.id} value={venue.id}>
                    {venue.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hold_date">Tarih</Label>
            <DatePicker id="hold_date" value={date} onChange={(v) => setDate(v ?? "")} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hold_start">Başlangıç</Label>
              <Input
                id="hold_start"
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hold_end">Bitiş</Label>
              <Input
                id="hold_end"
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hold_expires">Opsiyon bitiş tarihi ve saati</Label>
            <Input
              id="hold_expires"
              type="datetime-local"
              value={expires}
              onChange={(e) => setExpires(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Bu zamana kadar tarih başka müşteriye verilmez.
            </p>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Opsiyona al
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ExtendHoldDialog({ holdId, leadId }: { holdId: string; leadId: string }) {
  const [open, setOpen] = useState(false);
  const [expires, setExpires] = useState(defaultExpiry());
  const [pending, startTransition] = useTransition();
  const guard = useSubmitGuard();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!guard.begin()) return;
    startTransition(async () => {
      try {
        const result = await extendHold(holdId, leadId, expires);
        if (result.ok) {
          toast.success("Opsiyon uzatıldı.");
          setOpen(false);
        } else {
          toast.error(result.error);
        }
      } finally {
        guard.end();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Opsiyonu uzat
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Opsiyonu uzat</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="extend_expires">Yeni bitiş zamanı</Label>
            <Input
              id="extend_expires"
              type="datetime-local"
              value={expires}
              onChange={(e) => setExpires(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Uzat
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Varsayılan opsiyon süresi: 48 saat. */
function defaultExpiry(): string {
  const when = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}T${pad(when.getHours())}:${pad(when.getMinutes())}`;
}
