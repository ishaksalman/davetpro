import { View } from "react-native";
import { ActivityIndicator } from "react-native";
import type { Venue } from "@/lib/database.types";
import { useAvailability } from "~/lib/data/availability";
import { availabilityView, type AvailabilityView } from "~/lib/domain/availability";
import { isValidTime } from "~/lib/domain/money-input";
import { useSessionContext } from "~/lib/auth/session";
import { Banner } from "~/ui/Feedback";
import { Text } from "~/ui/Text";

/** Müsaitlik şeridi + üst forma engel bildirimi. Asıl otorite veritabanı trigger'ı. */
export function useAvailabilityView(a: {
  venue: Venue | null; eventDate: string; startTime: string; endTime: string; ignoreReservationId?: string | null;
}) {
  const { vertical } = useSessionContext();
  const ready = !!a.venue && !a.venue.allows_overlap && !!a.eventDate && isValidTime(a.startTime) && isValidTime(a.endTime);
  const q = useAvailability(ready ? { eventDate: a.eventDate, startTime: a.startTime, endTime: a.endTime, ignoreReservationId: a.ignoreReservationId } : null);
  const view: AvailabilityView = ready && q.data
    ? availabilityView({ rows: q.data, venue: a.venue, eventDate: a.eventDate, startTime: a.startTime, endTime: a.endTime, vertical })
    : { kind: "idle" };
  return { ready, query: q, view };
}

export function AvailabilityNotice({ ready, query, view }: ReturnType<typeof useAvailabilityView>) {
  if (!ready) return null;
  if (query.isError) {
    return <Banner tone="danger" title={query.error instanceof Error ? query.error.message : "Müsaitlik kontrol edilemedi"} body="Kaydetmeye çalışırsanız çakışma varsa sunucu engelleyecektir." />;
  }
  if (query.isLoading || !query.data) {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <ActivityIndicator size="small" />
        <Text variant="footnote" color="textSecondary">Müsaitlik kontrol ediliyor…</Text>
      </View>
    );
  }
  switch (view.kind) {
    case "ok": return <Banner tone="success" title={view.text} />;
    case "warn": return <Banner tone="warning" title="Dar aralık" body={view.text} />;
    case "block": return <Banner tone={view.hold ? "warning" : "danger"} title={view.hold ? "Opsiyonlu" : "Çakışma"} body={view.text} />;
    case "info": return <Banner tone="info" title={view.text} />;
    default: return null;
  }
}
