import { useState, type ReactNode } from "react";
import { FlatList, View } from "react-native";
import { formatDate, formatMoney } from "@/lib/format";
import { todayISO } from "@/lib/time";
import { useSessionContext } from "~/lib/auth/session";
import { useDeliveryQueue } from "~/lib/data/management";
import { usePullRefresh, useRefetchOnFocus } from "~/lib/hooks";
import { CardSkeleton, EmptyState, ErrorState } from "~/ui/Feedback";
import { Icon } from "~/ui/Icon";
import { Screen } from "~/ui/Screen";
import { Text } from "~/ui/Text";
import { ReservationCard } from "~/features/cards";
import { DeliverySheet } from "~/features/delivery-sheet";

/**
 * Teslimat takibi (yalnızca teslim akışı kullanan işletmelerde: fotoğrafçı).
 * Liste iki kaynaktan: tarihi geçmiş çekimler VE teslim durumu elle işaretlenmiş olanlar.
 * Fotoğrafçıda sekme (büyük başlık), diğer yerde push ekranı (satır içi başlık): başlığı çağıran verir.
 */
export function DeliveryList({ header }: { header: ReactNode }) {
  const { vertical: v, canFinance } = useSessionContext();
  const q = useDeliveryQueue(v.usesDelivery);
  useRefetchOnFocus(q.refetch);
  const pull = usePullRefresh(q.refetch);
  const [selId, setSelId] = useState<string | null>(null);
  const sel = q.data?.find((r) => r.id === selId) ?? null;
  const today = todayISO();

  if (!v.usesDelivery) return <Screen>{header}<EmptyState title="Bu işletme türünde teslimat yok" description="Teslimat takibi çekim sonrası akış kullanan işletmeler içindir." /></Screen>;

  return (
    <Screen>
      {header}
      {q.isError ? (
        <View style={{ paddingHorizontal: 16 }}><ErrorState message={q.error instanceof Error ? q.error.message : undefined} onRetry={() => q.refetch()} /></View>
      ) : q.isLoading ? (
        <View style={{ paddingHorizontal: 16, gap: 10 }}>{[0, 1, 2].map((i) => <CardSkeleton key={i} />)}</View>
      ) : (
        <FlatList
          data={q.data}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 10 }}
          onRefresh={pull.onRefresh}
          refreshing={pull.refreshing}
          ListEmptyComponent={<EmptyState title="Teslim bekleyen iş yok" description="Çekimi yapılmış bir kayıt olduğunda burada görünecek." />}
          renderItem={({ item }) => {
            const late = item.delivery_due_date && item.delivery_due_date < today;
            return (
              <ReservationCard
                row={item}
                onPress={() => setSelId(item.id)}
                extra={
                  item.delivery_due_date || (canFinance && item.balance_amount > 0) ? (
                    <View style={{ gap: 4, paddingTop: 6 }}>
                      {item.delivery_due_date ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Icon name="calendar-clock" size={14} color={late ? "feedbackDanger" : "iconSecondary"} />
                          <Text variant="caption" color={late ? "feedbackDanger" : "textSecondary"}>Teslim hedefi {formatDate(item.delivery_due_date)}{late ? " · gecikti" : ""}</Text>
                        </View>
                      ) : null}
                      {canFinance && item.balance_amount > 0 ? <Text variant="caption" color="textSecondary">Teslimde tahsil edilecek: {formatMoney(item.balance_amount)}</Text> : null}
                    </View>
                  ) : null
                }
              />
            );
          }}
        />
      )}
      {sel ? <DeliverySheet row={sel} visible onClose={() => setSelId(null)} /> : null}
    </Screen>
  );
}
