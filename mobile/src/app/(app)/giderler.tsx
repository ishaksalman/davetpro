import { useState } from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/format";
import { useSessionContext } from "~/lib/auth/session";
import { useExpenseListData, type ExpenseItem } from "~/lib/data/finance-lists";
import { RANGE_LABELS, type RangePreset } from "~/lib/domain/ranges";
import { useRefetchOnFocus } from "~/lib/hooks";
import { useTheme } from "~/design/theme";
import { radius } from "~/design/tokens";
import { Fab } from "~/ui/Button";
import { Banner, EmptyState, ErrorState, RowSkeleton } from "~/ui/Feedback";
import { FilterChip } from "~/ui/Inputs";
import { ListGroup, ListRow } from "~/ui/List";
import { InlineHeader, Screen, ScrollScreen } from "~/ui/Screen";
import { BottomSheet } from "~/ui/Sheet";
import { Text } from "~/ui/Text";
import { TransactionRow } from "~/features/cards";
import { ExpenseSheet, VoidDialog } from "~/features/finance-sheets";

/**
 * Giderler: ödemeler ve masraflar, işlem tarihine göre. Bir rezervasyona bağlı gider o işin
 * KÂRLILIĞINA yansır; genel gider yalnızca nakit akışına. Değiştirilemez: silme yok, iptal var.
 */
export default function ExpensesScreen() {
  const { colors } = useTheme();
  const { canFinance } = useSessionContext();
  const [preset, setPreset] = useState<RangePreset>("bu-ay");
  const q = useExpenseListData(preset, canFinance);
  useRefetchOnFocus(q.refetch);
  const [add, setAdd] = useState(false);
  const [menu, setMenu] = useState<ExpenseItem | null>(null);
  const [voidId, setVoidId] = useState<string | null>(null);

  if (!canFinance) return <Screen><InlineHeader title="Giderler" /><EmptyState title="Yetkiniz yok" description="Finansal verileri görme yetkiniz bulunmuyor." /></Screen>;

  return (
    <Screen>
      <InlineHeader title="Giderler" />
      <ScrollScreen onRefresh={() => q.refetch()} refreshing={q.isRefetching && !q.isLoading} bottomPad={120}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ flexGrow: 0 }}>
          {(Object.keys(RANGE_LABELS) as RangePreset[]).map((p) => <FilterChip key={p} label={RANGE_LABELS[p]} selected={preset === p} onPress={() => setPreset(p)} />)}
        </ScrollView>

        {q.isError ? (
          <ErrorState message={q.error instanceof Error ? q.error.message : undefined} onRetry={() => q.refetch()} />
        ) : q.isLoading || !q.data ? (
          <ListGroup><RowSkeleton /><RowSkeleton /><RowSkeleton /></ListGroup>
        ) : (
          <>
            <View style={{ padding: 20, gap: 14, borderRadius: radius.xl, backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.borderSubtle }}>
              <View style={{ gap: 4 }}>
                <Text variant="footnoteMedium" color="textSecondary">Dönem gideri · {RANGE_LABELS[preset]}</Text>
                <Text variant="display" color="moneyExpense" numberOfLines={1} adjustsFontSizeToFit>{formatMoney(q.data.total)}</Text>
                <Text variant="caption" color="textTertiary">{q.data.count} işlem</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Mini label="Rezervasyona bağlı" value={formatMoney(q.data.linked)} />
                <Mini label="Genel gider" value={formatMoney(q.data.general)} />
              </View>
            </View>
            {q.data.truncated ? <Banner tone="warning" title="Liste üst sınıra ulaştı" body="Daha dar bir dönem seçin; bazı kayıtlar gösterilmiyor olabilir." /> : null}

            {q.data.items.length === 0 ? (
              <EmptyState title="Bu dönemde gider yok" description="Ödemeler ve masraflar işlem tarihine göre burada listelenir." action={{ label: "Gider ekle", icon: "plus", onPress: () => setAdd(true) }} />
            ) : (
              <ListGroup>
                {q.data.items.map((e) => (
                  <TransactionRow
                    key={e.id} kind="expense" amount={e.amount} voided={!!e.voided_at} voidReason={e.void_reason}
                    title={e.vendor ? `${e.category_name} · ${e.vendor}` : e.category_name}
                    meta={`${e.reservation_label ? `${e.reservation_label} · ` : ""}${e.description ? `${e.description} · ` : ""}${PAYMENT_METHOD_LABELS[e.method]} · ${formatDate(e.expense_date)}`}
                    onPress={() => setMenu(e)}
                  />
                ))}
              </ListGroup>
            )}
          </>
        )}
      </ScrollScreen>
      <View pointerEvents="box-none" style={{ position: "absolute", right: 16, bottom: 32 }}><Fab label="Gider ekle" onPress={() => setAdd(true)} /></View>

      <ExpenseSheet reservation={null} visible={add} onClose={() => setAdd(false)} />
      <BottomSheet visible={!!menu} title={menu ? `${formatMoney(menu.amount)} · ${formatDate(menu.expense_date)}` : "Gider"} onClose={() => setMenu(null)} scroll={false}>
        <ListGroup style={{ borderWidth: 0 }}>
          {menu?.reservation_id ? <ListRow icon="calendar-check" title="Rezervasyonu aç" subtitle={menu.reservation_label ?? undefined} onPress={() => { const id = menu.reservation_id!; setMenu(null); router.push({ pathname: "/rezervasyon/[id]", params: { id } }); }} /> : <ListRow icon="info" title="Genel gider" subtitle="Bu gider bir rezervasyona bağlı değil; yalnızca nakit akışına yansır." />}
          {menu && !menu.voided_at ? <ListRow icon="ban" title="Gideri iptal et" subtitle="Kayıt silinmez; nedeniyle birlikte saklanır." destructive onPress={() => { setVoidId(menu.id); setMenu(null); }} /> : null}
        </ListGroup>
      </BottomSheet>
      <VoidDialog kind="expenses" id={voidId} visible={!!voidId} onClose={() => setVoidId(null)} />
    </Screen>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, padding: 12, gap: 4, borderRadius: radius.md, backgroundColor: colors.bgSurfaceSunken }}>
      <Text variant="caption" color="textSecondary">{label}</Text>
      <Text variant="numericM" numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}
