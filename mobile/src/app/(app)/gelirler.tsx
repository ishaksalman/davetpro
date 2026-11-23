import { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { INCOME_CATEGORY_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/format";
import type { PaymentMethod } from "@/lib/database.types";
import { useSessionContext } from "~/lib/auth/session";
import { usePaymentList, type PaymentItem } from "~/lib/data/finance-lists";
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
import { PaymentSheet, VoidDialog } from "~/features/finance-sheets";

/**
 * Gelirler = tahsilatlar, NAKİT AKIŞI (işlem tarihine göre). Kayıtlar değiştirilemez:
 * silme yok, iptal `voided_at` + neden ile; iptal edilenler listede üstü çizili kalır.
 */
export default function IncomeScreen() {
  const { colors } = useTheme();
  const { canFinance } = useSessionContext();
  const [preset, setPreset] = useState<RangePreset>("bu-ay");
  const [method, setMethod] = useState<PaymentMethod | "hepsi">("hepsi");
  const q = usePaymentList(preset, canFinance);
  useRefetchOnFocus(q.refetch);
  const [add, setAdd] = useState(false);
  const [menu, setMenu] = useState<PaymentItem | null>(null);
  const [voidId, setVoidId] = useState<string | null>(null);

  const items = useMemo(() => (q.data?.items ?? []).filter((i) => method === "hepsi" || i.method === method), [q.data, method]);

  if (!canFinance) return <Screen><InlineHeader title="Gelirler" /><EmptyState title="Yetkiniz yok" description="Finansal verileri görme yetkiniz bulunmuyor." /></Screen>;

  return (
    <Screen>
      <InlineHeader title="Gelirler" />
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
                <Text variant="footnoteMedium" color="textSecondary">Dönem tahsilatı · {RANGE_LABELS[preset]}</Text>
                <Text variant="display" color="moneyIncome" numberOfLines={1} adjustsFontSizeToFit>{formatMoney(q.data.total)}</Text>
                <Text variant="caption" color="textTertiary">{q.data.count} işlem</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Mini label="Nakit" value={formatMoney(q.data.cash)} />
                <Mini label="Rezervasyona bağlı" value={formatMoney(q.data.linked)} />
              </View>
            </View>
            {q.data.truncated ? <Banner tone="warning" title="Liste üst sınıra ulaştı" body="Daha dar bir dönem seçin; bazı kayıtlar gösterilmiyor olabilir." /> : null}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ flexGrow: 0 }}>
              <FilterChip label="Tümü" selected={method === "hepsi"} onPress={() => setMethod("hepsi")} />
              {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => <FilterChip key={m} label={PAYMENT_METHOD_LABELS[m]} selected={method === m} onPress={() => setMethod(m)} />)}
            </ScrollView>

            {items.length === 0 ? (
              <EmptyState title="Bu dönemde tahsilat yok" description="Tahsilatlar işlem tarihine göre burada listelenir." action={{ label: "Tahsilat ekle", icon: "plus", onPress: () => setAdd(true) }} />
            ) : (
              <ListGroup>
                {items.map((p) => (
                  <TransactionRow
                    key={p.id} kind="income" amount={p.amount} voided={!!p.voided_at} voidReason={p.void_reason}
                    title={`${INCOME_CATEGORY_LABELS[p.category]}${p.customer_name ? ` · ${p.customer_name}` : ""}`}
                    meta={`${PAYMENT_METHOD_LABELS[p.method]} · ${formatDate(p.payment_date)}${p.description ? ` · ${p.description}` : ""}`}
                    onPress={() => setMenu(p)}
                  />
                ))}
              </ListGroup>
            )}
          </>
        )}
      </ScrollScreen>
      <View pointerEvents="box-none" style={{ position: "absolute", right: 16, bottom: 32 }}><Fab label="Tahsilat ekle" onPress={() => setAdd(true)} /></View>

      <PaymentSheet reservation={null} visible={add} onClose={() => setAdd(false)} />
      <BottomSheet visible={!!menu} title={menu ? `${formatMoney(menu.amount)} · ${formatDate(menu.payment_date)}` : "Tahsilat"} onClose={() => setMenu(null)} scroll={false}>
        <ListGroup style={{ borderWidth: 0 }}>
          {menu?.reservation_id ? <ListRow icon="calendar-check" title="Rezervasyonu aç" subtitle={menu.reservation_label ?? undefined} onPress={() => { const id = menu.reservation_id!; setMenu(null); router.push({ pathname: "/rezervasyon/[id]", params: { id } }); }} /> : <ListRow icon="info" title="Manuel gelir" subtitle="Bu tahsilat bir rezervasyona bağlı değil." />}
          {menu && !menu.voided_at ? <ListRow icon="ban" title="Tahsilatı iptal et" subtitle="Kayıt silinmez; nedeniyle birlikte saklanır." destructive onPress={() => { setVoidId(menu.id); setMenu(null); }} /> : null}
        </ListGroup>
      </BottomSheet>
      <VoidDialog kind="payments" id={voidId} visible={!!voidId} onClose={() => setVoidId(null)} />
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
