import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { LEAD_STATUS_LABELS } from "@/lib/constants";
import { useLeadList, type LeadScope } from "~/lib/data/leads";
import { useDebounced, usePullRefresh, useRefetchOnFocus } from "~/lib/hooks";
import { Fab } from "~/ui/Button";
import { CardSkeleton, EmptyState, ErrorState } from "~/ui/Feedback";
import { FilterChip, SearchBar } from "~/ui/Inputs";
import { InlineHeader, Screen } from "~/ui/Screen";
import { LeadCard } from "~/features/lead-card";

const SCOPES: { value: LeadScope; label: string }[] = [
  { value: "acik", label: "Açık" },
  { value: "yeni", label: LEAD_STATUS_LABELS.yeni },
  { value: "teklif_verildi", label: LEAD_STATUS_LABELS.teklif_verildi },
  { value: "opsiyonlu", label: LEAD_STATUS_LABELS.opsiyonlu },
  { value: "kazanildi", label: LEAD_STATUS_LABELS.kazanildi },
  { value: "kaybedildi", label: LEAD_STATUS_LABELS.kaybedildi },
];

export default function LeadsScreen() {
  const [scope, setScope] = useState<LeadScope>("acik");
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search);
  const q = useLeadList(scope, debounced);
  useRefetchOnFocus(q.refetch);
  const pull = usePullRefresh(q.refetch);
  const rows = useMemo(() => q.data?.pages.flatMap((p) => p.rows) ?? [], [q.data]);

  return (
    <Screen>
      <InlineHeader title="Talepler" />
      <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 12, paddingBottom: 8 }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Ad veya telefon ara" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ flexGrow: 0 }}>
          {SCOPES.map((s) => <FilterChip key={s.value} label={s.label} selected={scope === s.value} onPress={() => setScope(s.value)} />)}
        </ScrollView>
      </View>
      {q.isError ? (
        <View style={{ paddingHorizontal: 16 }}><ErrorState message={q.error instanceof Error ? q.error.message : undefined} onRetry={() => q.refetch()} /></View>
      ) : q.isLoading ? (
        <View style={{ paddingHorizontal: 16, gap: 10 }}>{[0, 1, 2].map((i) => <CardSkeleton key={i} />)}</View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, gap: 10 }}
          keyboardShouldPersistTaps="handled"
          onRefresh={pull.onRefresh}
          refreshing={pull.refreshing}
          onEndReachedThreshold={0.5}
          onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
          ListFooterComponent={q.isFetchingNextPage ? <ActivityIndicator style={{ padding: 16 }} /> : undefined}
          ListEmptyComponent={
            debounced.trim()
              ? <EmptyState title="Aramaya uyan talep yok" description="Ad veya telefonun bir bölümünü yazın." action={{ label: "Aramayı temizle", onPress: () => setSearch("") }} />
              : <EmptyState title="Bu filtrede talep yok" description="Telefon, Instagram veya web formundan gelen talepler burada toplanır." action={{ label: "Talep ekle", icon: "plus", onPress: () => router.push("/talepler/form") }} />
          }
          renderItem={({ item }) => <LeadCard row={item} onPress={() => router.push({ pathname: "/talepler/[id]", params: { id: item.id } })} />}
        />
      )}
      <View pointerEvents="box-none" style={{ position: "absolute", right: 16, bottom: 32 }}>
        <Fab label="Yeni talep" onPress={() => router.push("/talepler/form")} />
      </View>
    </Screen>
  );
}
