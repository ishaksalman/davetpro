import { formatDate, formatTimeRange } from "@/lib/format";
import type { VenueAvailability } from "@/lib/database.types";
import type { Vertical } from "@/lib/vertical";

export type AvailabilityView =
  | { kind: "idle" }
  | { kind: "info"; text: string }
  | { kind: "ok"; text: string }
  | { kind: "warn"; text: string }
  | { kind: "block"; text: string; hold: boolean };

/**
 * Müsaitlik sonucunu kullanıcıya gösterilecek duruma çevirir.
 * Web `AvailabilityCheck` ile aynı karar ağacı (src/components/shared/availability-check.tsx):
 *  - serbest alanda ("Dış mekân"/"Diğer") kural işlemez → hiçbir şey gösterilmez;
 *  - yalnızca severity 'engel' kaydı durdurur, 'uyari' bilgilendirir;
 *  - saatler çakışmıyor ama asgari 1 saat boşluk yoksa (gap_minutes) ayrı mesaj.
 * Bu yalnızca erken uyarıdır; nihai otorite veritabanı trigger'ıdır.
 */
export function availabilityView(a: {
  rows: VenueAvailability[];
  venue: { id: string; allows_overlap: boolean } | null;
  eventDate: string;
  startTime: string;
  endTime: string;
  vertical: Pick<Vertical, "resource" | "event">;
}): AvailabilityView {
  const { rows, venue, vertical: v } = a;
  if (venue?.allows_overlap) return { kind: "idle" };

  const kaynak = v.resource.singular.toLocaleLowerCase("tr-TR");
  const kaynakCogul = v.resource.plural.toLocaleLowerCase("tr-TR");
  const period = `${formatDate(a.eventDate)} ${formatTimeRange(a.startTime, a.endTime)}`;
  const selected = venue ? rows.find((r) => r.venue_id === venue.id) : undefined;

  if (!selected) {
    const alts = rows.filter((r) => r.is_available);
    return {
      kind: "info",
      text: alts.length > 0 ? `${period} için müsait ${kaynakCogul}: ${alts.map((x) => x.venue_name).join(", ")}` : `${period} için müsait ${kaynak} yok.`,
    };
  }
  if (selected.severity === null) return { kind: "ok", text: `${selected.venue_name} · ${period} müsait.` };

  const neighbour = selected.conflict_start && selected.conflict_end ? formatTimeRange(selected.conflict_start, selected.conflict_end) : null;

  if (selected.severity === "uyari") {
    return {
      kind: "warn",
      text:
        `Aynı gün bu ${kaynak} için ${selected.conflict_label} adına bir ${selected.conflict_kind === "opsiyon" ? "opsiyon" : v.event.singular} var` +
        `${neighbour ? ` (${neighbour})` : ""}. Arada ${selected.gap_minutes} dakika kalıyor — hazırlık için yeterli olduğundan emin olun. Kaydetmenize engel değil.`,
    };
  }

  if (selected.gap_minutes !== null) {
    return {
      kind: "block",
      hold: false,
      text: `İki ${v.event.singular} arasında en az 1 saat olmalı${selected.conflict_label ? ` (${selected.conflict_label}${neighbour ? ` · ${neighbour}` : ""})` : ""}`,
    };
  }

  const isHold = selected.conflict_kind === "opsiyon";
  return {
    kind: "block",
    hold: isHold,
    text: isHold
      ? `${period} aralığında bu ${kaynak} opsiyonlu. ${selected.conflict_label ?? ""}${neighbour ? ` · ${neighbour}` : ""} Farklı bir tarih veya ${kaynak} seçin.`
      : `${period} aralığında bu ${kaynak} dolu: ${selected.conflict_label ?? "kesin rezervasyon"}${neighbour ? ` · ${neighbour}` : ""}. Farklı bir tarih veya ${kaynak} seçin.`,
  };
}

/** Gönder düğmesinin yanındaki engel metni (web `submitBlockedReason` ile aynı). */
export function submitBlockedReason(view: AvailabilityView, v: Pick<Vertical, "resource" | "event">): string | null {
  if (view.kind !== "block") return null;
  const kucuk = v.resource.singular.toLocaleLowerCase("tr-TR");
  if (view.text.startsWith("İki ")) return `İki ${v.event.singular} arasında en az 1 saat olmalı.`;
  return view.hold
    ? `Seçilen ${kucuk} ve saat opsiyonlu. Farklı bir tarih veya ${kucuk} seçin.`
    : `Seçilen ${kucuk} ve saatte kesin rezervasyon var. Farklı bir tarih veya ${kucuk} seçin.`;
}
