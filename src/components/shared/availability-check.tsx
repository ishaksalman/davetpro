"use client";

import { useEffect, useState, useTransition } from "react";
import { CalendarCheck, CircleAlert, Loader2, TriangleAlert } from "lucide-react";
import { formatDate, formatTimeRange } from "@/lib/format";
import { relativeDay } from "@/lib/relative-date";
import { SCHEMA_OUTDATED_MESSAGE } from "@/lib/errors";
import type { VenueAvailability } from "@/lib/database.types";
import { checkAvailability } from "@/lib/availability-actions";

type Outcome =
  | { key: string; ok: true; rows: VenueAvailability[] }
  | { key: string; ok: false; error: string };

/**
 * Tarih + başlangıç/bitiş saati girildiğinde müsaitliği gösterir.
 *
 * Kaynak, rezervasyon modülünün kendi verisi: kesin rezervasyonlar ve süresi
 * dolmamış opsiyonlar. Saat aralığı tamamlanmadan sorgu atılmaz.
 *
 * Bu yalnızca bilgilendirme ve erken uyarı; asıl engel veritabanı trigger'ında.
 */
export function AvailabilityCheck({
  eventDate,
  startTime,
  endTime,
  venueId,
  ignoreLeadId,
  ignoreReservationId,
  onConflictChange,
}: {
  eventDate: string | null;
  startTime: string | null;
  endTime: string | null;
  venueId: string | null;
  /** Düzenlenen talebin kendi opsiyonu çakışma sayılmasın. */
  ignoreLeadId?: string | null;
  /** Düzenlenen rezervasyon kendi kendisiyle çakışıyor görünmesin. */
  ignoreReservationId?: string | null;
  /** Seçilen salonun dolu olup olmadığını üst forma bildirir. */
  onConflictChange?: (conflict: VenueAvailability | null) => void;
}) {
  // Sonuç, hangi sorguya ait olduğuyla birlikte saklanıyor. Böylece girdi
  // değiştiğinde effect içinde state sıfırlamak gerekmiyor; eski sonucun
  // güncel girdiye ait olmadığı render sırasında anlaşılıyor.
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [, startTransition] = useTransition();

  // Saat aralığı tamamlanmadan sorgu atılmıyor: yarım girdiyle "müsait" demek
  // yanıltıcı olur. Gün bazlı denetim sunucu tarafında zaten duruyor —
  // saatsiz kaydetmeye çalışırsanız trigger engelliyor.
  const ready = Boolean(eventDate && startTime && endTime);
  const key = `${eventDate}|${startTime}|${endTime}|${ignoreLeadId ?? ""}|${ignoreReservationId ?? ""}`;

  useEffect(() => {
    if (!ready) return;
    startTransition(async () => {
      const response = await checkAvailability({
        eventDate: eventDate!,
        startTime: startTime!,
        endTime: endTime!,
        ignoreLeadId,
        ignoreReservationId,
      });
      setOutcome(
        response.error
          ? { key, ok: false, error: response.error }
          : { key, ok: true, rows: response.rows },
      );
    });
  }, [ready, key, eventDate, startTime, endTime, ignoreLeadId, ignoreReservationId]);

  const current = outcome?.key === key ? outcome : null;
  const rows = current?.ok ? current.rows : null;
  const forVenue = rows && venueId
    ? (rows.find((r) => r.venue_id === venueId) ?? null)
    : null;
  // Yalnızca 'engel' gönderimi kilitler; 'uyari' bilgilendirme.
  const conflictForVenue = forVenue?.severity === "engel" ? forVenue : null;

  // Üst form gönderimi buna göre kilitliyor. Effect içinde çağrılıyor ki
  // render sırasında üst bileşenin state'i değişmesin.
  useEffect(() => {
    onConflictChange?.(conflictForVenue);
  }, [conflictForVenue, onConflictChange]);

  if (!ready) return null;

  // Sorgu hatası yutulmaz: "müsait" gibi görünüp kullanıcıyı yanıltmasın.
  if (current && !current.ok) {
    // Şema eksikse sunucu tarafı denetim de yoktur; "sunucu yine de engeller"
    // demek bu durumda yanlış olurdu.
    const schemaOutdated = current.error === SCHEMA_OUTDATED_MESSAGE;
    return (
      <div className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
        <p className="flex items-start gap-2">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>{current.error}</span>
        </p>
        <p className="mt-1.5 pl-6 text-xs opacity-90">
          {schemaOutdated
            ? "Bu güncelleme yapılana kadar çakışma denetimi çalışmaz; dolu bir tarihe talep açılabilir."
            : "Müsaitlik şu an kontrol edilemedi. Kaydetmeye çalışırsanız çakışma varsa sunucu engelleyecektir."}
        </p>
      </div>
    );
  }

  if (!rows) {
    return (
      <p className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Müsaitlik kontrol ediliyor…
      </p>
    );
  }

  const selected = venueId ? rows.find((r) => r.venue_id === venueId) : null;
  const alternatives = rows.filter((r) => r.is_available && r.venue_id !== venueId);
  const period = `${formatDate(eventDate!)} ${formatTimeRange(startTime!, endTime!)}`;

  if (!selected) {
    return (
      <p className="rounded-lg bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground">
        {alternatives.length > 0
          ? `${period} için müsait salonlar: ${alternatives.map((a) => a.venue_name).join(", ")}`
          : `${period} için müsait salon yok.`}
      </p>
    );
  }

  if (selected.severity === null) {
    return (
      <p className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-700 dark:text-emerald-400">
        <CalendarCheck className="size-4 shrink-0" />
        <span>
          <strong>{selected.venue_name}</strong> · {period} müsait.
        </span>
      </p>
    );
  }

  const neighbourTime =
    selected.conflict_start && selected.conflict_end
      ? formatTimeRange(selected.conflict_start, selected.conflict_end)
      : null;

  // Dar aralık: kaydetmeye engel değil, ama kullanıcının bilerek onaylaması iyi.
  if (selected.severity === "uyari") {
    return (
      <p className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2.5 text-sm text-amber-800 dark:text-amber-300">
        <CircleAlert className="mt-0.5 size-4 shrink-0" />
        <span>
          Aynı gün bu salonda {selected.conflict_label} adına bir{" "}
          {selected.conflict_kind === "opsiyon" ? "opsiyon" : "organizasyon"} var
          {neighbourTime && ` (${neighbourTime})`}. Arada{" "}
          <strong>{selected.gap_minutes} dakika</strong> kalıyor — hazırlık için
          yeterli olduğundan emin olun. Kaydetmenize engel değil.
        </span>
      </p>
    );
  }

  const isHold = selected.conflict_kind === "opsiyon";
  const conflictTime = neighbourTime;

  // gap_minutes doluysa saatler üst üste binmiyor: engelin tek nedeni asgari
  // boşluk kuralı. Bu durumda "rezervasyon var" demek kafa karıştırıyor —
  // kullanıcı saatlerin çakışmadığını zaten görüyor. Kuralı tek satırda söyle.
  //
  // "1 saat" metni min_gap_minutes() = 60 ile eşleşiyor; SQL'deki sabit
  // değişirse burası da güncellenmeli.
  if (selected.gap_minutes !== null) {
    return (
      <p className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
        <CircleAlert className="mt-0.5 size-4 shrink-0" />
        <span>
          İki organizasyon arasında en az 1 saat olmalı
          {selected.conflict_label && (
            <>
              {" "}
              ({selected.conflict_label}
              {conflictTime && ` · ${conflictTime}`})
            </>
          )}
        </span>
      </p>
    );
  }

  return (
    <div
      className={
        isHold
          ? "rounded-lg bg-orange-500/10 px-3 py-2.5 text-sm text-orange-800 dark:text-orange-300"
          : "rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
      }
    >
      <p className="flex items-start gap-2">
        <CircleAlert className="mt-0.5 size-4 shrink-0" />
        <span>
          {isHold ? (
            <>
              {period} aralığında bu salon <strong>opsiyonlu</strong>.{" "}
              {selected.conflict_label}
              {conflictTime && ` · ${conflictTime}`}
              {selected.hold_expires_at && (
                <> · Opsiyon bitişi {relativeDay(selected.hold_expires_at)}</>
              )}
            </>
          ) : (
            <>
              {period} aralığında bu salonda{" "}
              <strong>kesin rezervasyon</strong> var. {selected.conflict_label}
              {conflictTime && ` · ${conflictTime}`}
            </>
          )}
        </span>
      </p>
      {alternatives.length > 0 && (
        <p className="mt-1.5 pl-6 text-xs opacity-90">
          Aynı gün müsait: {alternatives.map((a) => a.venue_name).join(", ")}
        </p>
      )}
    </div>
  );
}
