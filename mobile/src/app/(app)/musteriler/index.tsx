import { useMemo, useState } from "react";
import { FlatList, View } from "react-native";
import { router } from "expo-router";
import { formatMoney, formatPhone } from "@/lib/format";
import { useSessionContext } from "~/lib/auth/session";
import { useCustomerBalances } from "~/lib/data/customers";
import { useLookups } from "~/lib/data/lookups";
import { useDebounced, usePullRefresh } from "~/lib/hooks";
import { Avatar } from "~/ui/Badge";
import { Fab } from "~/ui/Button";
import { EmptyState, ErrorState, RowSkeleton } from "~/ui/Feedback";
import { SearchBar } from "~/ui/Inputs";
import { ListGroup, ListRow } from "~/ui/List";
import { InlineHeader, Screen } from "~/ui/Screen";
import { Text } from "~/ui/Text";
import { CustomerSheet } from "~/features/customer-sheet";

export default function CustomersScreen() {
  const { canFinance } = useSessionContext();
  const lookups = useLookups();
  const balances = useCustomerBalances(canFinance);
  const pull = usePullRefresh(() => Promise.all([lookups.refetch(), balances.refetch()]));
  const [q, setQ] = useState("");
  const [sheet, setSheet] = useState(false);
  const needle = useDebounced(q).trim().toLocaleLowerCase("tr-TR");
  const digits = needle.replace(/\D/g, "");

  const rows = useMemo(() => {
    const all = lookups.data?.customers ?? [];
    if (!needle) return all;
    return all.filter((c) => c.full_name.toLocaleLowerCase("tr-TR").includes(needle) || (digits.length >= 3 && c.phone.replace(/\D/g, "").includes(digits)));
  }, [lookups.data, needle, digits]);

  return (
    <Screen>
      <InlineHeader title="Müşteriler" />
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 8 }}>
        <SearchBar value={q} onChangeText={setQ} placeholder="Ad veya telefon ara" />
        {lookups.data ? <Text variant="footnote" color="textSecondary">{lookups.data.customers.length} kayıtlı müşteri</Text> : null}
      </View>
      {lookups.isError ? (
        <View style={{ paddingHorizontal: 16 }}><ErrorState message={lookups.error instanceof Error ? lookups.error.message : undefined} onRetry={() => lookups.refetch()} /></View>
      ) : lookups.isLoading ? (
        <View style={{ paddingHorizontal: 16 }}><ListGroup><RowSkeleton /><RowSkeleton /><RowSkeleton /></ListGroup></View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          onRefresh={pull.onRefresh}
          refreshing={pull.refreshing}
          ListEmptyComponent={
            needle
              ? <EmptyState title="Aramaya uyan müşteri yok" description="Ad veya telefonun bir bölümünü yazın." action={{ label: "Aramayı temizle", onPress: () => setQ("") }} />
              : <EmptyState title="Henüz müşteri yok" description="İlk müşterinizi ekleyin; rezervasyon ve tahsilatlar müşteriye bağlanır." action={{ label: "Yeni müşteri", icon: "plus", onPress: () => setSheet(true) }} />
          }
          ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
          renderItem={({ item, index }) => {
            const b = balances.data?.get(item.id);
            return (
              <View style={{ borderTopLeftRadius: index === 0 ? 20 : 0, borderTopRightRadius: index === 0 ? 20 : 0, borderBottomLeftRadius: index === rows.length - 1 ? 20 : 0, borderBottomRightRadius: index === rows.length - 1 ? 20 : 0, overflow: "hidden" }}>
                <ListRow
                  title={item.full_name}
                  subtitle={formatPhone(item.phone)}
                  onPress={() => router.push({ pathname: "/musteriler/[id]", params: { id: item.id } })}
                  right={
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      {canFinance && b && Number(b.total_balance) > 0 ? (
                        <View style={{ alignItems: "flex-end" }}>
                          <Text variant="numericS">{formatMoney(b.total_balance)}</Text>
                          <Text variant="caption" color="textTertiary">kalan</Text>
                        </View>
                      ) : null}
                      <Avatar name={item.full_name} size="S" />
                    </View>
                  }
                />
              </View>
            );
          }}
        />
      )}
      <View pointerEvents="box-none" style={{ position: "absolute", right: 16, bottom: 32 }}>
        <Fab label="Yeni müşteri" icon="user-plus" onPress={() => setSheet(true)} />
      </View>
      <CustomerSheet visible={sheet} onClose={() => setSheet(false)} onSaved={(id) => router.push({ pathname: "/musteriler/[id]", params: { id } })} />
    </Screen>
  );
}
