import { useState } from "react";
import { View } from "react-native";
import { VENUE_COLORS } from "@/lib/constants";
import { formatPhone } from "@/lib/format";
import type { Team } from "@/lib/database.types";
import { useSessionContext } from "~/lib/auth/session";
import { useLookups } from "~/lib/data/lookups";
import { StatusBadge, VenueDot } from "~/ui/Badge";
import { Fab } from "~/ui/Button";
import { EmptyState, ErrorState, RowSkeleton } from "~/ui/Feedback";
import { ListGroup, ListRow } from "~/ui/List";
import { InlineHeader, Screen, ScrollScreen } from "~/ui/Screen";
import { TeamSheet } from "~/features/definition-sheets";

export default function TeamsScreen() {
  const { vertical: v, isAdmin } = useSessionContext();
  const q = useLookups();
  const [edit, setEdit] = useState<Team | null>(null);
  const [open, setOpen] = useState(false);
  const teams = q.data?.teams ?? [];
  const next = VENUE_COLORS[teams.length % VENUE_COLORS.length];
  if (!v.usesTeams) return <Screen><InlineHeader title="Ekipler" /><EmptyState title="Bu işletme türünde ekip yok" description="Ekipler çekim ekibi atayan işletmeler içindir." /></Screen>;
  return (
    <Screen>
      <InlineHeader title="Ekipler" />
      <ScrollScreen onRefresh={() => q.refetch()} refreshing={q.isRefetching} bottomPad={120}>
        {q.isError ? <ErrorState message={q.error instanceof Error ? q.error.message : undefined} onRetry={() => q.refetch()} /> : q.isLoading ? (
          <ListGroup><RowSkeleton /><RowSkeleton /></ListGroup>
        ) : teams.length === 0 ? (
          <EmptyState title="Henüz ekip yok" description="Çekimlere atayacağınız ekipleri ekleyin (zorunlu değil)." action={isAdmin ? { label: "Yeni ekip", icon: "plus", onPress: () => setOpen(true) } : undefined} />
        ) : (
          <ListGroup>
            {teams.map((t) => (
              <ListRow
                key={t.id} title={t.name} subtitle={[t.members, t.phone ? formatPhone(t.phone) : null].filter(Boolean).join(" · ") || undefined}
                right={<View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>{!t.is_active ? <StatusBadge label="Pasif" tone="neutral" size="S" /> : null}<VenueDot color={t.color} size={14} /></View>}
                onPress={isAdmin ? () => { setEdit(t); setOpen(true); } : undefined}
              />
            ))}
          </ListGroup>
        )}
      </ScrollScreen>
      {isAdmin ? <View pointerEvents="box-none" style={{ position: "absolute", right: 16, bottom: 32 }}><Fab label="Yeni ekip" onPress={() => { setEdit(null); setOpen(true); }} /></View> : null}
      <TeamSheet team={edit} nextColor={next} visible={open} onClose={() => setOpen(false)} />
    </Screen>
  );
}
