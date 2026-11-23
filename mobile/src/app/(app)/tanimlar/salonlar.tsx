import { useState } from "react";
import { View } from "react-native";
import { VENUE_COLORS } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import type { Venue } from "@/lib/database.types";
import { useSessionContext } from "~/lib/auth/session";
import { useLookups } from "~/lib/data/lookups";
import { StatusBadge, VenueDot } from "~/ui/Badge";
import { Fab } from "~/ui/Button";
import { EmptyState, ErrorState, RowSkeleton } from "~/ui/Feedback";
import { ListGroup, ListRow } from "~/ui/List";
import { InlineHeader, Screen, ScrollScreen } from "~/ui/Screen";
import { VenueSheet } from "~/features/definition-sheets";

/** Salonlar / mekânlar / platolar (işletme türüne göre ad). Serbest alan satırı ("Dış mekân", "Diğer") düzenlenebilir ama silinemez. */
export default function VenuesScreen() {
  const { vertical: v, isAdmin } = useSessionContext();
  const q = useLookups();
  const [edit, setEdit] = useState<Venue | null>(null);
  const [open, setOpen] = useState(false);
  const venues = q.data?.venues ?? [];
  const next = VENUE_COLORS[venues.length % VENUE_COLORS.length];
  return (
    <Screen>
      <InlineHeader title={v.resource.plural} />
      <ScrollScreen onRefresh={() => q.refetch()} refreshing={q.isRefetching} bottomPad={120}>
        {q.isError ? <ErrorState message={q.error instanceof Error ? q.error.message : undefined} onRetry={() => q.refetch()} /> : q.isLoading ? (
          <ListGroup><RowSkeleton /><RowSkeleton /></ListGroup>
        ) : venues.length === 0 ? (
          <EmptyState title={v.resourceEmpty} description="Takvim ve çakışma kontrolü buna göre çalışır." action={isAdmin ? { label: v.resourceNew, icon: "plus", onPress: () => setOpen(true) } : undefined} />
        ) : (
          <ListGroup>
            {venues.map((x) => (
              <ListRow
                key={x.id}
                title={x.name}
                subtitle={[x.allows_overlap ? "Serbest alan · çakışma kuralı yok" : null, x.capacity ? `${formatNumber(x.capacity)} kişi` : null, x.description].filter(Boolean).join(" · ") || undefined}
                right={<View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>{!x.is_active ? <StatusBadge label="Pasif" tone="neutral" size="S" /> : null}<VenueDot color={x.color} size={14} /></View>}
                onPress={isAdmin ? () => { setEdit(x); setOpen(true); } : undefined}
              />
            ))}
          </ListGroup>
        )}
      </ScrollScreen>
      {isAdmin ? <View pointerEvents="box-none" style={{ position: "absolute", right: 16, bottom: 32 }}><Fab label={v.resourceNew} onPress={() => { setEdit(null); setOpen(true); }} /></View> : null}
      <VenueSheet venue={edit} nextColor={next} visible={open} onClose={() => setOpen(false)} />
    </Screen>
  );
}
