import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { useAppSession } from "~/lib/auth/session";
import { useMonthCount, useReservationList, type ListScope } from "~/lib/data/reservations";
import { useDebounced, usePullRefresh, useRefetchOnFocus } from "~/lib/hooks";
import { useSessionContext } from "~/lib/auth/session";
import { CardSkeleton, EmptyState, ErrorState } from "~/ui/Feedback";
import { Fab } from "~/ui/Button";
import { FilterChip, SearchBar } from "~/ui/Inputs";
import { SectionHeader } from "~/ui/List";
import { LargeHeader, Screen } from "~/ui/Screen";
import { ReservationCard } from "~/features/cards";
import type { ReservationRow } from "~/lib/data/types";

type Item = { type: "header"; key: string; title: string } | { type: "row"; key: string; row: ReservationRow };

const SCOPES: { value: ListScope; label: string }[] = [
  { value: "upcoming", label: "Yaklaşan" },
  { value: "month", label: "Bu ay" },
  { value: "past", label: "Geçmiş" },
  { value: "cancelled", label: "İptal" },
];

/** Satırları ay başlıklarıyla ("EKİM 2026") gruplar; sıra sunucudan geldiği gibi. */
function withMonthHeaders(rows: ReservationRow[]): Item[] {
  const out: Item[] = [];
  let last = "";
  for (const row of rows) {
    const key = row.event_date.slice(0, 7);
    if (key !== last) {
      last = key;
      out.push({ type: "header", key: `h-${key}`, title: format(parseISO(row.event_date), "LLLL yyyy", { locale: tr }) });
    }
    out.push({ type: "row", key: row.id, row });
  }
  return out;
}

export default function ReservationsScreen() {
  useAppSession();
  const { vertical: v } = useSessionContext();
  const [scope, setScope] = useState<ListScope>("upcoming");
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search);
  const q = useReservationList(scope, debounced);
  const monthCount = useMonthCount();
  useRefetchOnFocus(q.refetch);
  const pull = usePullRefresh(q.refetch);

  const rows = useMemo(() => q.data?.pages.flatMap((p) => p.rows) ?? [], [q.data]);
  const items = useMemo(() => withMonthHeaders(rows), [rows]);
  const searching = debounced.trim() !== "";

  return (
    <Screen>
      <LargeHeader title="Rezervasyonlar" actions={[{ icon: "plus", label: "Yeni rezervasyon", onPress: () => router.push("/rezervasyon/form") }]} />
      <View style={{ paddingHorizontal: 16, gap: 16, paddingBottom: 8 }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Ad, telefon veya tarih ara" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ flexGrow: 0 }}>
          {SCOPES.map((s) => (
            <FilterChip key={s.value} label={s.label} selected={scope === s.value} onPress={() => setScope(s.value)} count={s.value === "month" && monthCount.data !== undefined ? monthCount.data : undefined} />
          ))}
        </ScrollView>
      </View>

      {q.isError ? (
        <View style={{ paddingHorizontal: 16 }}><ErrorState message={q.error instanceof Error ? q.error.message : undefined} onRetry={() => q.refetch()} /></View>
      ) : q.isLoading ? (
        <View style={{ paddingHorizontal: 16, gap: 10 }}>{[0, 1, 2].map((i) => <CardSkeleton key={i} />)}</View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.key}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, gap: 10 }}
          onRefresh={pull.onRefresh}
          refreshing={pull.refreshing}
          onEndReachedThreshold={0.5}
          onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            searching ? (
              <EmptyState title="Aramaya uyan kayıt yok" description="Ad, telefon veya tam tarih (gg.aa.yyyy) ile aramayı deneyin." action={{ label: "Aramayı temizle", onPress: () => setSearch("") }} />
            ) : (
              <EmptyState
                title={scope === "cancelled" ? "İptal edilen kayıt yok" : `Henüz ${v.event.singular} yok`}
                description={scope === "upcoming" ? `İlk ${v.event.singular} kaydını oluşturun; takvim ve tahsilatlar buradan başlar.` : "Bu filtreye uyan kayıt bulunamadı."}
                action={scope === "upcoming" ? { label: "Yeni kayıt", icon: "plus", onPress: () => router.push("/rezervasyon/form") } : undefined}
              />
            )
          }
          ListFooterComponent={q.isFetchingNextPage ? <ActivityIndicator style={{ padding: 16 }} /> : undefined}
          renderItem={({ item }) =>
            item.type === "header" ? (
              <View style={{ paddingTop: 10 }}><SectionHeader title={item.title} /></View>
            ) : (
              <ReservationCard row={item.row} onPress={() => router.push({ pathname: "/rezervasyon/[id]", params: { id: item.row.id } })} />
            )
          }
        />
      )}

      <View pointerEvents="box-none" style={{ position: "absolute", right: 16, bottom: 16, left: 16, alignItems: "flex-end" }}>
        <Fab label={"Yeni rezervasyon"} onPress={() => router.push("/rezervasyon/form")} />
      </View>
    </Screen>
  );
}
