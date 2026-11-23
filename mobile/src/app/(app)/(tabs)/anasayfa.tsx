import { View } from "react-native";
import { router } from "expo-router";
import { formatDate, formatMoney } from "@/lib/format";
import { ORGANIZATION_TYPE_LABELS } from "@/lib/constants";

import { useAppSession, useSessionContext } from "~/lib/auth/session";
import { useDashboard } from "~/lib/data/dashboard";
import { useRefetchOnFocus } from "~/lib/hooks";
import { Avatar } from "~/ui/Badge";
import { Banner, CardSkeleton, EmptyState, ErrorState, Skeleton } from "~/ui/Feedback";
import { Icon } from "~/ui/Icon";
import { ListGroup, ListRow, SectionHeader } from "~/ui/List";
import { Screen, ScrollScreen } from "~/ui/Screen";
import { Text } from "~/ui/Text";
import { useTheme } from "~/design/theme";
import { Pressable } from "react-native";
import { ReservationCard } from "~/features/cards";
import { StartGuide } from "~/features/onboarding/start-guide";
import { HeroCard, MonthWeekCard, OccupancyCard } from "~/features/dashboard-widgets";
import { businessHour, firstName, greeting, greetingDate } from "~/features/format-helpers";

export default function HomeScreen() {
  const { colors } = useTheme();
  const s = useAppSession();
  const { vertical: v, canFinance } = useSessionContext();
  const q = useDashboard(canFinance);
  useRefetchOnFocus(q.refetch);

  const sub = s.subscription;
  const data = q.data;

  return (
    <Screen>
      <ScrollScreen onRefresh={() => q.refetch()} refreshing={q.isRefetching && !q.isLoading} bottomPad={32}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 4 }}>
          <View style={{ gap: 4, flex: 1 }}>
            <Text variant="overline" color="textTertiary">{greetingDate(data?.today ?? new Date().toISOString().slice(0, 10))}</Text>
            <Text variant="titleLarge" numberOfLines={1} accessibilityRole="header">
              {greeting(businessHour())}, {firstName(s.profile.full_name)}
            </Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Hesabım" onPress={() => router.push("/hesap")} hitSlop={8}>
            <Avatar name={s.profile.full_name} />
          </Pressable>
        </View>

        {sub?.isWarning && sub.state !== "sona_erdi" ? (
          <Banner
            tone="warning"
            title={sub.daysLeft === 0 ? "Erişim süreniz bugün bitiyor" : `Erişim süreniz ${sub.daysLeft} gün içinde bitiyor`}
            body={`${formatDate(sub.accessUntil)} tarihinden sonra uygulamayı kullanamazsınız. Uzatmak için Daha → Hesap.`}
          />
        ) : null}

        <StartGuide />

        {q.isError ? (
          <ErrorState message={q.error instanceof Error ? q.error.message : undefined} onRetry={() => q.refetch()} />
        ) : q.isLoading || !data ? (
          <View style={{ gap: 16 }}>
            <View style={{ flexDirection: "row", gap: 12 }}><Skeleton height={128} radius={20} style={{ flex: 1 }} /><Skeleton height={128} radius={20} style={{ flex: 1 }} /></View>
            <CardSkeleton />
            <CardSkeleton />
          </View>
        ) : (
          <>
            {data.finance ? (
              <HeroCard
                label="Bu ay tahsilat" value={formatMoney(data.finance.collectedThisMonth)} trend={data.finance.collectedTrend}
                series={data.finance.series} footLabel="Bekleyen alacak"
                footValue={formatMoney(data.finance.outstanding)}
                foot2Label="Bekleyen" foot2Value={`${data.finance.outstandingCount}${data.finance.outstandingTruncated ? "+" : ""} ${v.event.singular}`}
              />
            ) : null}

            <View style={{ flexDirection: "row", gap: 12 }}>
              <MonthWeekCard count={data.counts.month} unit={v.event.singular} months={data.months} />
              <OccupancyCard percent={data.occupancy} trend={data.occupancyTrend} />
            </View>

            <View style={{ gap: 10 }}>
              <SectionHeader
                title={`Bugün · ${data.todayRows.length} ${v.event.singular}`}
                action="Takvim" onAction={() => router.navigate("/takvim")}
              />
              {data.todayRows.length === 0 ? (
                <View style={{ padding: 16, borderRadius: 20, backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.borderSubtle, flexDirection: "row", gap: 12, alignItems: "center" }}>
                  <Icon name="calendar-days" size={20} color="iconSecondary" />
                  <Text variant="subhead" color="textSecondary" style={{ flex: 1 }}>Bugün için {v.event.singular} yok.</Text>
                </View>
              ) : (
                data.todayRows.map((r) => <ReservationCard key={r.id} row={r} onPress={() => router.push({ pathname: "/rezervasyon/[id]", params: { id: r.id } })} />)
              )}
            </View>

            {data.finance ? (
              <View style={{ gap: 10 }}>
                <SectionHeader title="Yaklaşan tahsilatlar" action="Tümü" onAction={() => router.navigate("/rezervasyonlar")} />
                {data.finance.due.length === 0 ? (
                  <EmptyState title="Yaklaşan tahsilat yok" description={`Vade tarihi girilmiş ve bakiyesi kalan ${v.event.plural} burada görünür.`} />
                ) : (
                  <ListGroup>
                    {data.finance.due.map((r) => (
                      <ListRow
                        key={r.id}
                        icon="wallet"
                        title={r.customer?.full_name ?? "—"}
                        subtitle={`${ORGANIZATION_TYPE_LABELS[r.organization_type]}${v.usesResource && r.venue ? ` · ${r.venue.name}` : ""}`}
                        right={
                          <View style={{ alignItems: "flex-end", gap: 2 }}>
                            <Text variant="numericS" color="moneyOutstanding">{formatMoney(r.balance_amount)}</Text>
                            <Text variant="caption" color={r.due_date && r.due_date < data.today ? "feedbackDanger" : "textTertiary"}>Vade {formatDate(r.due_date)}</Text>
                          </View>
                        }
                        onPress={() => router.push({ pathname: "/rezervasyon/[id]", params: { id: r.id } })}
                      />
                    ))}
                  </ListGroup>
                )}
              </View>
            ) : null}
          </>
        )}
      </ScrollScreen>
    </Screen>
  );
}
