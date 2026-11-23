import { Children, Fragment, type ReactNode } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "~/design/theme";
import { radius } from "~/design/tokens";
import { Icon, type IconName } from "./Icon";
import { Text } from "./Text";

/** Bölüm etiketi. Büyük harf metinde yazılır (Türkçe İ/I; textTransform bilmez). */
export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4 }}>
      <Text variant="overline" color="textTertiary" accessibilityRole="header">{title.toLocaleUpperCase("tr-TR")}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={12} accessibilityRole="button">
          <Text variant="subheadSemibold" color="textLink">{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Inset grouped liste: kart zemininde satırlar, ayraç metin hizasından başlar. */
export function ListGroup({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const items = Children.toArray(children).filter(Boolean);
  return (
    <View style={[{ backgroundColor: colors.bgSurface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderSubtle, overflow: "hidden" }, style]}>
      {items.map((child, i) => (
        <Fragment key={i}>
          {child}
          {i < items.length - 1 ? <Divider inset={60} /> : null}
        </Fragment>
      ))}
    </View>
  );
}

export function Divider({ inset = 0 }: { inset?: number }) {
  const { colors } = useTheme();
  return <View style={{ height: 1, marginLeft: inset, backgroundColor: colors.borderSubtle }} />;
}

export function ListRow({
  title, subtitle, value, icon, onPress, chevron, right, destructive,
}: {
  title: string; subtitle?: string; value?: string; icon?: IconName;
  onPress?: () => void; chevron?: boolean; right?: ReactNode; destructive?: boolean;
}) {
  const { colors } = useTheme();
  const body = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingHorizontal: 16, paddingVertical: 12 }}>
      {icon ? (
        <View style={{ width: 32, height: 32, borderRadius: radius.sm, backgroundColor: colors.actionSecondary, alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={18} color={destructive ? "feedbackDanger" : "iconPrimary"} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyMedium" color={destructive ? "feedbackDanger" : "textPrimary"} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text variant="footnote" color="textSecondary" numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      {value ? <Text variant="subhead" color="textSecondary" numberOfLines={1} style={{ maxWidth: "50%" }}>{value}</Text> : null}
      {right}
      {chevron || (onPress && !right) ? <Icon name="chevron-right" size={18} color="iconSecondary" /> : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ backgroundColor: pressed ? colors.actionSecondary : "transparent" })}>
      {body}
    </Pressable>
  );
}

/** Tahsilat ilerlemesi; tam ödendiğinde yeşile döner. */
export function Progress({ value }: { value: number }) {
  const { colors } = useTheme();
  const v = Math.max(0, Math.min(100, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(v) }}
      style={{ height: 6, borderRadius: radius.full, backgroundColor: colors.bgSurfaceSunken, overflow: "hidden" }}
    >
      <View style={{ width: `${v}%`, height: 6, borderRadius: radius.full, backgroundColor: v >= 100 ? colors.feedbackSuccess : colors.actionAccent }} />
    </View>
  );
}
