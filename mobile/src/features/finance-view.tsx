import { useState } from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { ORGANIZATION_TYPE_LABELS } from "@/lib/constants";
import { formatMoney, formatMoneyCompact, formatPercent } from "@/lib/format";
import { useSessionContext } from "~/lib/auth/session";
import { useFinanceReport } from "~/lib/data/finance-reports";
import { RANGE_LABELS, monthShort, type RangePreset } from "~/lib/domain/ranges";
import { useRefetchOnFocus } from "~/lib/hooks";
import { useTheme } from "~/design/theme";
import { radius } from "~/design/tokens";
import { BarPairChart } from "~/ui/BarChart";
import { Banner, EmptyState, ErrorState, RowSkeleton, Skeleton } from "~/ui/Feedback";
import { Icon } from "~/ui/Icon";
import { FilterChip, SegmentedControl } from "~/ui/Inputs";
import { ListGroup, ListRow, SectionHeader } from "~/ui/List";
import { IconButton } from "~/ui/Button";
import { InlineHeader, LargeHeader, Screen, ScrollScreen } from "~/ui/Screen";
import { Text } from "~/ui/Text";
import { TransactionRow } from "~/features/cards";
import { BottomSheet } from "~/ui/Sheet";
import { ExpenseSheet, PaymentSheet } from "~/features/finance-sheets";

/** Sekmede büyük başlık; Daha'dan açılınca (fotoğrafçı) geri düğmeli satır içi başlık. */
function Header({ pushed, actions }: { pushed: boolean; actions?: { icon: "plus"; label: string; onPress: () => void }[] }) {
  if (!pushed) return <LargeHeader title="Finans" actions={actions} />;
  const a = actions?.[0];
  return <InlineHeader title="Finans" trailing={a ? <IconButton icon={a.icon} label={a.label} onPress={a.onPress} /> : undefined} />;
}

/**
 * Finans: NAKIT AKIŞI (tahsilat/gider, işlem tarihine göre) ile KÂRLILIK (satış/kâr,
 * organizasyon tarihine göre) ayrı sekmelerde — ikisi aynı kartta/grafikte karışmaz.
 * Finans yetkisi olmayan kullanıcıda sekme hiç yok; ekran yine de RLS'e güvenir.
 */
export function FinanceView({ pushed = false }: { pushed?: boolean }) {
  const { colors } = useTheme();
  const { vertical: v, canFinance } = useSessionContext();
  const [tab, setTab] = useState<"nakit" | "karlilik">("nakit");
  const [preset, setPreset] = useState<RangePreset>("bu-ay");
  const [expOpen, setExpOpen] = useState(false);
  const [incOpen, setIncOpen] = useState(false);
  const [pick, setPick] = useState(false);
  const q = useFinanceReport(preset, canFinance);
  useRefetchOnFocus(q.refetch);

  if (!canFinance) {
    return <Screen><Header pushed={pushed} /><View style={{ paddingHorizontal: 16 }}><EmptyState title="Yetkiniz yok" description="Finansal bilgileri görme yetkiniz bulunmuyor." /></View></Screen>;
  }

  const r = q.data;
  const s = r?.summary;
  const chart = (r?.series ?? []).map((m) => ({ label: monthShort(m.month), a: tab === "nakit" ? Number(m.collected) : Number(m.sales), b: Number(m.expenses) }));

  return (
    <Screen>
      <Header pushed={pushed} actions={[{ icon: "plus", label: "Ekle", onPress: () => setPick(true) }]} />
      <ScrollScreen onRefresh={() => q.refetch()} refreshing={q.isRefetching && !q.isLoading} bottomPad={32}>
        <SegmentedControl options={[{ value: "nakit", label: "Nakit akışı" }, { value: "karlilik", label: "Kârlılık" }]} value={tab} onChange={setTab} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ flexGrow: 0 }}>
          {(Object.keys(RANGE_LABELS) as RangePreset[]).map((p) => <FilterChip key={p} label={RANGE_LABELS[p]} selected={preset === p} onPress={() => setPreset(p)} />)}
        </ScrollView>

        {q.isError ? (
          <ErrorState message={q.error instanceof Error ? q.error.message : undefined} onRetry={() => q.refetch()} />
        ) : q.isLoading || !r || !s ? (
          <View style={{ gap: 16 }}><Skeleton height={328} radius={20} /><ListGroup><RowSkeleton /><RowSkeleton /></ListGroup></View>
        ) : tab === "nakit" ? (
          <>
            <View style={{ padding: 21, gap: 16, borderRadius: radius.xl, backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.borderSubtle }}>
              <View style={{ gap: 4 }}>
                <Text variant="footnoteMedium" color="textSecondary">Net nakit · {RANGE_LABELS[preset]}</Text>
                <Text variant="display" color={Number(s.net_cash) < 0 ? "moneyExpense" : "textPrimary"} adjustsFontSizeToFit numberOfLines={1}>{formatMoney(s.net_cash)}</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Split icon="arrow-down-left" label="Tahsilat" value={`+${formatMoney(s.collected_in_range)}`} color="moneyIncome" bg="feedbackSuccessSubtle" />
                <Split icon="arrow-up-right" label="Gider" value={`−${formatMoney(s.total_expenses)}`} color="moneyExpense" bg="feedbackDangerSubtle" />
              </View>
              <BarPairChart data={chart} aColor="feedbackSuccess" bColor="feedbackDanger" aName="Tahsilat" bName="Gider" format={formatMoneyCompact} />
            </View>
            <ListGroup>
              <ListRow icon="arrow-down-left" title="Gelirler" subtitle="Tahsilatlar, manuel gelir ekleme" onPress={() => router.push("/gelirler")} />
              <ListRow icon="arrow-up-right" title="Giderler" subtitle="Ödemeler ve masraflar" onPress={() => router.push("/giderler")} />
            </ListGroup>
            <View style={{ gap: 10 }}>
              <SectionHeader title="Son hareketler" />
              {r.movements.length === 0 ? (
                <EmptyState title="Bu dönemde hareket yok" description="Tahsilat ve giderler işlem tarihine göre burada listelenir." />
              ) : (
                <ListGroup>
                  {r.movements.map((m) => (
                    <TransactionRow
                      key={m.key} kind={m.kind} title={m.title} meta={m.meta} amount={m.amount} voided={m.voided} voidReason={m.voidReason}
                      onPress={m.reservationId ? () => router.push({ pathname: "/rezervasyon/[id]", params: { id: m.reservationId! } }) : undefined}
                    />
                  ))}
                </ListGroup>
              )}
            </View>
          </>
        ) : (
          <>
            <View style={{ padding: 21, gap: 16, borderRadius: radius.xl, backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.borderSubtle }}>
              <View style={{ gap: 4 }}>
                <Text variant="footnoteMedium" color="textSecondary">Toplam satış · {RANGE_LABELS[preset]}</Text>
                <Text variant="display" adjustsFontSizeToFit numberOfLines={1}>{formatMoney(s.total_sales)}</Text>
                <Text variant="footnote" color="textSecondary">{s.reservation_count} {v.event.singular} · tahsil {formatMoney(s.collected_in_range)} · bekleyen {formatMoney(s.outstanding)}</Text>
              </View>
              {/* Dönemde gider yoksa kâr = satış, marj %100 görünür: bu sonuç değil eksik veri. */}
              {Number(s.total_expenses) === 0 ? (
                <Banner tone="warning" title="Kâr hesabı için gider girin" body="Bu dönemde hiç gider girilmedi; kâr ve marj anlamlı değil." />
              ) : (
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <Split icon="trending-up" label="Kâr" value={formatMoney(s.profit)} color={Number(s.profit) >= 0 ? "moneyIncome" : "moneyExpense"} bg={Number(s.profit) >= 0 ? "feedbackSuccessSubtle" : "feedbackDangerSubtle"} />
                  <Split icon="chart" label="Kâr marjı" value={formatPercent(s.profit_margin)} color="textPrimary" bg="actionSecondary" />
                </View>
              )}
              <BarPairChart data={chart} aColor="actionAccent" bColor="feedbackDanger" aName="Satış" bName="Gider" format={formatMoneyCompact} />
              <Text variant="caption" color="textTertiary">Grafik: son 6 ay · mavi satış (organizasyon tarihine göre), kırmızı gider.</Text>
            </View>
            {r.venues.length > 0 && v.usesResource ? (
              <View style={{ gap: 10 }}>
                <SectionHeader title={`${v.resource.singular} bazında`} />
                <ListGroup>
                  {r.venues.map((x) => <ListRow key={x.venue_id} title={x.venue_name} subtitle={`${x.reservation_count} ${v.event.singular} · satış ${formatMoney(x.sales)}`} value={`Kâr ${formatMoney(x.profit)}`} />)}
                </ListGroup>
              </View>
            ) : null}
            {r.types.length > 0 ? (
              <View style={{ gap: 10 }}>
                <SectionHeader title="Türe göre" />
                <ListGroup>
                  {r.types.map((x) => <ListRow key={x.organization_type} title={ORGANIZATION_TYPE_LABELS[x.organization_type]} subtitle={`${x.reservation_count} ${v.event.singular}`} value={formatMoney(x.sales)} />)}
                </ListGroup>
              </View>
            ) : null}
          </>
        )}
      </ScrollScreen>
      <BottomSheet visible={pick} title="Ne eklemek istiyorsunuz?" onClose={() => setPick(false)} scroll={false}>
        <ListGroup style={{ borderWidth: 0 }}>
          <ListRow icon="arrow-down-left" title="Gelir (tahsilat)" subtitle="Rezervasyona bağlı ya da manuel" onPress={() => { setPick(false); setTimeout(() => setIncOpen(true), 250); }} />
          <ListRow icon="arrow-up-right" title="Gider" subtitle="Ödeme veya masraf" onPress={() => { setPick(false); setTimeout(() => setExpOpen(true), 250); }} />
        </ListGroup>
      </BottomSheet>
      <PaymentSheet reservation={null} visible={incOpen} onClose={() => setIncOpen(false)} />
      <ExpenseSheet reservation={null} visible={expOpen} onClose={() => setExpOpen(false)} />
    </Screen>
  );
}

function Split({ icon, label, value, color, bg }: { icon: "arrow-down-left" | "arrow-up-right" | "trending-up" | "chart"; label: string; value: string; color: "moneyIncome" | "moneyExpense" | "textPrimary"; bg: "feedbackSuccessSubtle" | "feedbackDangerSubtle" | "actionSecondary" }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, padding: 12, gap: 8, borderRadius: radius.md, backgroundColor: colors[bg] }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Icon name={icon} size={14} color={color === "textPrimary" ? "iconPrimary" : color === "moneyIncome" ? "feedbackSuccess" : "feedbackDanger"} />
        <Text variant="footnoteMedium" color="textSecondary">{label}</Text>
      </View>
      <Text variant="title2" color={color} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}
