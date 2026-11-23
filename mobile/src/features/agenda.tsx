import { Pressable, View } from "react-native";
import { ORGANIZATION_TYPE_LABELS } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import { useSessionContext } from "~/lib/auth/session";
import type { AgendaItem } from "~/lib/domain/agenda";
import { useTheme } from "~/design/theme";
import { radius } from "~/design/tokens";
import { Text } from "~/ui/Text";

/**
 * Ajanda bloğu: zemin salon renginin %12'si (koyu temada da okunur), sol 4 pt çubuk.
 * Opsiyon kesik çizgili ve "Opsiyon" etiketli: kesin rezervasyondan ayırt edilir.
 */
export function AgendaEvent({ item, onPress }: { item: AgendaItem; onPress?: () => void }) {
  const { colors } = useTheme();
  const { vertical: v } = useSessionContext();
  const color = item.kind === "reservation" ? (item.row.venue?.color ?? colors.borderStrong) : item.hold.venue_color;
  const title =
    item.kind === "reservation"
      ? `${item.row.customer?.full_name ?? "—"} · ${ORGANIZATION_TYPE_LABELS[item.row.organization_type]}`
      : `${item.hold.customer_name} · Opsiyon`;
  const meta =
    item.kind === "reservation"
      ? [v.usesResource ? item.row.venue?.name : item.row.location, v.usesGuestCount && item.row.guest_count ? `${formatNumber(item.row.guest_count)} kişi` : null].filter(Boolean).join(" · ")
      : item.hold.venue_name;
  const hold = item.kind === "hold";

  return (
    <View style={{ flexDirection: "row", gap: 12 }}>
      <View style={{ width: 44, gap: 2, paddingTop: 10 }}>
        <Text variant="footnoteMedium">{item.start}</Text>
        <Text variant="caption" color="textTertiary">{item.end}</Text>
      </View>
      <Pressable
        accessibilityRole={onPress ? "button" : undefined}
        accessibilityLabel={`${item.start} ${title}`}
        disabled={!onPress}
        onPress={onPress}
        style={{
          flex: 1, paddingVertical: 10, paddingRight: 12, paddingLeft: 16, gap: 2, borderRadius: radius.md, overflow: "hidden",
          backgroundColor: `${color}1f`, borderWidth: hold ? 1 : 0, borderStyle: hold ? "dashed" : "solid", borderColor: color,
        }}
      >
        <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, backgroundColor: color }} />
        <Text variant="subheadSemibold" numberOfLines={1}>{title}</Text>
        {meta ? <Text variant="caption" color="textSecondary" numberOfLines={1}>{meta}</Text> : null}
      </Pressable>
    </View>
  );
}
