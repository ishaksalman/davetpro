import { Pressable, View } from "react-native";
import { ORGANIZATION_TYPE_LABELS } from "@/lib/constants";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { useSessionContext } from "~/lib/auth/session";
import type { LeadRow } from "~/lib/data/leads";
import { LEAD_TONE, leadStatusLabel } from "~/lib/domain/leads";
import { useTheme } from "~/design/theme";
import { radius } from "~/design/tokens";
import { StatusBadge, VenueTag } from "~/ui/Badge";
import { Icon } from "~/ui/Icon";
import { Text } from "~/ui/Text";

export function LeadCard({ row, onPress }: { row: LeadRow; onPress: () => void }) {
  const { colors } = useTheme();
  const { vertical: v, canFinance } = useSessionContext();
  const meta = [ORGANIZATION_TYPE_LABELS[row.organization_type], row.event_date ? formatDate(row.event_date) : "Tarih belirsiz", v.usesGuestCount && row.guest_count ? `${formatNumber(row.guest_count)} kişi` : null].filter(Boolean).join(" · ");
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${row.customer?.full_name ?? "Talep"}, ${leadStatusLabel(row.status)}`}
      onPress={onPress}
      style={({ pressed }) => ({ padding: 16, gap: 8, borderRadius: radius.xl, backgroundColor: pressed ? colors.bgSurfaceSunken : colors.bgSurface, borderWidth: 1, borderColor: colors.borderSubtle })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text variant="headline" numberOfLines={1} style={{ flex: 1 }}>{row.customer?.full_name ?? "—"}</Text>
        <StatusBadge label={leadStatusLabel(row.status)} tone={LEAD_TONE[row.status]} size="S" />
      </View>
      <Text variant="footnote" color="textSecondary" numberOfLines={1}>{meta}</Text>
      {v.usesResource && row.venue ? <VenueTag name={row.venue.name} color={row.venue.color} /> : null}
      {canFinance && row.quote_amount !== null ? <Text variant="footnoteMedium" color="textSecondary">Teklif {row.quote_number} · {formatMoney(row.quote_amount)}</Text> : null}
      {row.follow_up_overdue ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Icon name="clock" size={14} color="feedbackDanger" />
          <Text variant="caption" color="feedbackDanger">Takip tarihi geçti · {formatDate(row.next_follow_up_at)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
