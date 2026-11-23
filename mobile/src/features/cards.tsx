import { Pressable, View } from "react-native";
import { useTheme } from "~/design/theme";
import { elevation, radius } from "~/design/tokens";
import { ORGANIZATION_TYPE_LABELS } from "@/lib/constants";
import { formatDate, formatMoney, formatNumber, formatTime } from "@/lib/format";
import { useSessionContext } from "~/lib/auth/session";
import { collectedPercent } from "~/lib/data/rows";
import type { ReservationRow } from "~/lib/data/types";
import { reservationBadge, reservationMeta } from "~/lib/domain/status";
import { StatusBadge, VenueTag } from "~/ui/Badge";
import { Icon, type IconName } from "~/ui/Icon";
import { Progress } from "~/ui/List";
import { Text } from "~/ui/Text";
import { dateBlock } from "./format-helpers";

/**
 * Rezervasyon kartı (Figma "Reservation Card"): sol şerit ve nokta salon rengi,
 * tamamı dokunulabilir. Finans bloğu yetkisiz kullanıcıda HİÇ çizilmez —
 * yer tutucu, bulanıklık ya da ₺0 gösterilmez.
 */
export function ReservationCard({ row, onPress, onLongPress, extra }: { row: ReservationRow; onPress: () => void; onLongPress?: () => void; extra?: import("react").ReactNode }) {
  const { colors } = useTheme();
  const { vertical: v, canFinance } = useSessionContext();
  const block = dateBlock(row.event_date);
  const badge = reservationBadge(row, v);
  const meta = reservationMeta(row, ORGANIZATION_TYPE_LABELS[row.organization_type], v, formatTime, formatNumber);
  const place = v.usesResource ? row.venue : null;
  const paidAll = row.net_amount > 0 && row.balance_amount <= 0;
  const stripe = row.venue?.color ?? colors.borderStrong;
  const name = row.customer?.full_name ?? "—";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${formatDate(row.event_date)}, ${badge.label}`}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => ({
        flexDirection: "row", gap: 14, paddingVertical: 14, paddingRight: 16, paddingLeft: 18, borderRadius: radius.xl,
        backgroundColor: pressed ? colors.bgSurfaceSunken : colors.bgSurface, borderWidth: 1, borderColor: colors.borderSubtle, overflow: "hidden",
      })}
    >
      <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, backgroundColor: stripe }} />
      <View style={{ width: 52, paddingVertical: 8, borderRadius: radius.md, backgroundColor: colors.bgSurfaceSunken, alignItems: "center", alignSelf: "flex-start" }}>
        <Text variant="overline" color="textTertiary" style={{ letterSpacing: 0.6 }}>{block.weekday}</Text>
        <Text variant="title1">{block.day}</Text>
        <Text variant="caption" color="textSecondary" numberOfLines={1} adjustsFontSizeToFit>{block.month}</Text>
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text variant="headline" numberOfLines={1} style={{ flex: 1 }}>{name}</Text>
          <StatusBadge label={badge.label} tone={badge.tone} size="S" />
        </View>
        <Text variant="footnote" color="textSecondary" numberOfLines={1}>{meta}</Text>
        {place ? <VenueTag name={place.name} color={place.color} /> : row.location ? <Text variant="footnoteMedium" color="textSecondary" numberOfLines={1}>{row.location}</Text> : null}
        {canFinance && row.net_amount > 0 ? (
          <View style={{ gap: 6, paddingTop: 6 }}>
            <Progress value={collectedPercent(row.net_amount, row.collected_amount)} />
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text variant="caption" color="textSecondary">Tahsil {formatMoney(row.collected_amount)}</Text>
              <Text variant="caption" color={paidAll ? "feedbackSuccess" : "moneyOutstanding"}>
                {paidAll ? "Tamamı ödendi" : `Kalan ${formatMoney(row.balance_amount)}`}
              </Text>
            </View>
          </View>
        ) : null}
        {extra}
      </View>
    </Pressable>
  );
}

/** Tahsilat (+, yeşil) / gider (−, kırmızı) / iptal (üstü çizili). İşaret metinde de var. */
export function TransactionRow({
  kind, title, meta, amount, voided, voidReason, onPress,
}: {
  kind: "income" | "expense"; title: string; meta: string; amount: number;
  voided?: boolean; voidReason?: string | null; onPress?: () => void;
}) {
  const { colors } = useTheme();
  const icon: IconName = voided ? "ban" : kind === "income" ? "arrow-down-left" : "arrow-up-right";
  const bg = voided ? colors.actionSecondary : kind === "income" ? colors.feedbackSuccessSubtle : colors.feedbackDangerSubtle;
  const fg = voided ? "textTertiary" : kind === "income" ? "feedbackSuccess" : "feedbackDanger";
  const sign = kind === "income" ? "+" : "−";
  const body = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={18} color={fg} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyMedium" color={voided ? "textSecondary" : "textPrimary"} numberOfLines={1}>{title}</Text>
        <Text variant="footnote" color="textSecondary" numberOfLines={2}>{voided && voidReason ? `${meta} · ${voidReason}` : meta}</Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 2 }}>
        <Text
          variant="numericS"
          color={voided ? "textTertiary" : kind === "income" ? "moneyIncome" : "moneyExpense"}
          style={voided ? { textDecorationLine: "line-through" } : undefined}
        >
          {voided ? formatMoney(amount) : `${sign}${formatMoney(amount)}`}
        </Text>
        {voided ? <Text variant="caption" color="feedbackDanger">İptal edildi</Text> : null}
      </View>
    </View>
  );
  if (!onPress) return body;
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ backgroundColor: pressed ? colors.actionSecondary : "transparent" })}>{body}</Pressable>;
}

/** KPI kartı. "Bu ay tahsilat" nakit akışıdır, "satış" kârlılıktır — aynı kartta karışmaz. */
const STAT_TONES = {
  neutral: { bg: "bgSurface", box: "actionSecondary", fg: "iconPrimary" },
  success: { bg: "feedbackSuccessSubtle", box: "feedbackSuccess", fg: "staticWhite" },
  warning: { bg: "feedbackWarningSubtle", box: "feedbackWarning", fg: "staticWhite" },
  info: { bg: "feedbackInfoSubtle", box: "feedbackInfo", fg: "staticWhite" },
  violet: { bg: "feedbackVioletSubtle", box: "feedbackViolet", fg: "staticWhite" },
} as const;

export function StatCard({
  icon, label, value, caption, trend, tone = "neutral",
}: { icon: IconName; label: string; value: string; caption?: string; trend?: { direction: "up" | "down" | "flat"; percent: number } | null; tone?: keyof typeof STAT_TONES }) {
  const { colors } = useTheme();
  const t = STAT_TONES[tone];
  const up = trend?.direction === "up";
  const show = trend && trend.direction !== "flat";
  // Figma "Dashboard 2026" ikili kart: beyaz 24 yarıçaplı kart, renkli ikon + etiket üstte,
  // büyük sayı yanında birim, altta isteğe bağlı artış rozeti.
  return (
    <View accessible accessibilityLabel={`${label}: ${value}${caption ? ` ${caption}` : ""}`} style={[elevation.e1, { flex: 1, padding: 18, gap: 14, borderRadius: 24, backgroundColor: colors[t.bg], borderWidth: 1, borderColor: colors.borderSubtle }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Icon name={icon} size={15} color={tone === "neutral" ? "iconPrimary" : t.fg === "staticWhite" ? "iconPrimary" : t.fg} />
        <Text variant="footnoteMedium" color="textSecondary" numberOfLines={1} style={{ flex: 1, fontWeight: "700" }}>{label}</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
        <Text variant="numericL" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 36, lineHeight: 46, letterSpacing: -1, paddingRight: 4 }}>{value}</Text>
        {caption ? <Text variant="caption" color="textTertiary" numberOfLines={1} style={{ flexShrink: 1, marginBottom: 5, fontWeight: "600" }}>{caption}</Text> : null}
      </View>
      {show ? (
        <View style={{ alignSelf: "flex-start", height: 22, paddingHorizontal: 8, gap: 3, borderRadius: 11, flexDirection: "row", alignItems: "center", backgroundColor: up ? colors.feedbackSuccessSubtle : colors.feedbackDangerSubtle }}>
          <Icon name={up ? "trending-up" : "trending-down"} size={12} color={up ? "feedbackOnSuccessSubtle" : "feedbackOnDangerSubtle"} />
          <Text variant="captionSmall" color={up ? "feedbackOnSuccessSubtle" : "feedbackOnDangerSubtle"}>%{trend!.percent} geçen aya göre</Text>
        </View>
      ) : null}
    </View>
  );
}
