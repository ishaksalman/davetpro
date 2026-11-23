import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { formatDate, formatTimeRange } from "@/lib/format";
import { todayISO } from "@/lib/time";
import { useSessionContext } from "~/lib/auth/session";
import { useAvailability } from "~/lib/data/availability";
import { isValidTime } from "~/lib/domain/money-input";
import { StatusBadge } from "~/ui/Badge";
import { Button } from "~/ui/Button";
import { Banner, RowSkeleton } from "~/ui/Feedback";
import { TimeField } from "~/ui/Inputs";
import { ListGroup, ListRow } from "~/ui/List";
import { DateField } from "~/ui/Pickers";
import { BottomSheet } from "~/ui/Sheet";
import { Text } from "~/ui/Text";

/** Müsaitlik kontrolü: tarih + saat aralığı için her salonun durumu (venue_availability RPC). */
export function AvailabilitySheet({ visible, onClose, initialDate }: { visible: boolean; onClose: () => void; initialDate?: string }) {
  return (
    <BottomSheet visible={visible} title="Müsaitlik kontrolü" onClose={onClose}>
      <Body onClose={onClose} initialDate={initialDate} />
    </BottomSheet>
  );
}

function Body({ onClose, initialDate }: { onClose: () => void; initialDate?: string }) {
  const { vertical: v } = useSessionContext();
  const [date, setDate] = useState<string | null>(initialDate ?? todayISO());
  const [start, setStart] = useState(v.defaultTimes.start);
  const [end, setEnd] = useState(v.defaultTimes.end);
  const ready = !!date && isValidTime(start) && isValidTime(end) && start !== end;
  const q = useAvailability(ready ? { eventDate: date!, startTime: start, endTime: end } : null);

  if (!v.usesResource) return <Banner tone="info" title="Bu işletme türünde çakışma kontrolü yok" body="Çekimler için plato/salon kısıtı uygulanmaz." />;

  return (
    <View style={{ gap: 16 }}>
      <DateField label="Tarih" value={date} onChange={setDate} />
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}><TimeField label="Başlangıç" value={start} onChange={setStart} /></View>
        <View style={{ flex: 1 }}><TimeField label="Bitiş" value={end} onChange={setEnd} /></View>
      </View>
      {!ready ? <Text variant="footnote" color="textSecondary">Müsaitlik için tarih ve geçerli bir saat aralığı girin.</Text> : null}
      {ready && q.isLoading ? <ListGroup><RowSkeleton /><RowSkeleton /></ListGroup> : null}
      {ready && q.isError ? <Banner tone="danger" title={q.error instanceof Error ? q.error.message : "Kontrol edilemedi"} body="Sonuç alınamadı; kaydetmeye çalışırsanız çakışmayı sunucu engeller." /> : null}
      {q.data ? (
        <ListGroup>
          {q.data.filter((r) => !r.allows_overlap).map((r) => {
            const busy = r.severity === "engel";
            const warn = r.severity === "uyari";
            const neighbour = r.conflict_start && r.conflict_end ? formatTimeRange(r.conflict_start, r.conflict_end) : null;
            return (
              <ListRow
                key={r.venue_id}
                title={r.venue_name}
                subtitle={busy || warn ? `${r.conflict_kind === "opsiyon" ? "Opsiyon" : "Rezervasyon"}: ${r.conflict_label ?? ""}${neighbour ? ` · ${neighbour}` : ""}${r.gap_minutes !== null ? ` · arada ${r.gap_minutes} dk` : ""}` : `${formatDate(date)} ${start}–${end}`}
                right={<StatusBadge label={busy ? "Dolu" : warn ? "Dar aralık" : "Müsait"} tone={busy ? "danger" : warn ? "warning" : "success"} size="S" />}
                onPress={!busy ? () => { onClose(); router.push({ pathname: "/rezervasyon/form", params: { tarih: date!, salon: r.venue_id } }); } : undefined}
              />
            );
          })}
        </ListGroup>
      ) : null}
      {q.data && q.data.every((r) => r.allows_overlap) ? <Text variant="footnote" color="textSecondary">Tanımlı {v.resource.plural.toLocaleLowerCase("tr-TR")} yok.</Text> : null}
      <Button label="Kapat" variant="secondary" onPress={onClose} />
    </View>
  );
}
