import { useRef } from "react";
import { ActivityIndicator, Animated, Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { useTheme } from "~/design/theme";
import { elevation, radius } from "~/design/tokens";
import type { Colors } from "~/design/tokens";
import { Icon, type IconName } from "./Icon";
import { Text } from "./Text";

type Style = "primary" | "secondary" | "outline" | "ghost" | "destructive";
type Size = "L" | "M" | "S";

const SIZE = {
  L: { h: 52, px: 24, gap: 8, r: radius.lg, label: "labelL", icon: 20, min: 120 },
  M: { h: 44, px: 20, gap: 6, r: radius.md, label: "labelM", icon: 18, min: 88 },
  S: { h: 34, px: 14, gap: 6, r: radius.sm, label: "labelS", icon: 16, min: 64 },
} as const;

function palette(style: Style, c: Colors) {
  switch (style) {
    case "primary": return { bg: c.actionPrimary, pressed: c.actionPrimaryPressed, fg: c.actionOnPrimary, dbg: c.actionDisabled, dfg: c.actionOnDisabled };
    case "secondary": return { bg: c.actionSecondary, pressed: c.actionSecondaryPressed, fg: c.actionOnSecondary, dbg: c.actionDisabled, dfg: c.actionOnDisabled };
    case "outline": return { bg: "transparent", pressed: c.actionSecondary, fg: c.textPrimary, line: c.borderStrong, dbg: "transparent", dfg: c.textDisabled };
    case "ghost": return { bg: "transparent", pressed: c.actionAccentSubtle, fg: c.textLink, dbg: "transparent", dfg: c.textDisabled };
    case "destructive": return { bg: c.actionDestructive, pressed: c.actionDestructivePressed, fg: c.actionOnDestructive, dbg: c.actionDisabled, dfg: c.actionOnDisabled };
  }
}

/** Basılınca scale 0.98 / 90 ms (Figma notu). */
function usePressScale() {
  const v = useRef(new Animated.Value(1)).current;
  const to = (n: number) => Animated.timing(v, { toValue: n, duration: 90, useNativeDriver: true }).start();
  return { v, onPressIn: () => to(0.98), onPressOut: () => to(1) };
}

export function Button({
  label, onPress, variant = "primary", size = "L", icon, loading, disabled, fullWidth = true, align = "flex-start", accessibilityLabel,
}: {
  label: string;
  onPress?: () => void;
  variant?: Style;
  size?: Size;
  icon?: IconName;
  /** Yüklenirken etiket gizlenir ama genişlik korunur; ikinci dokunuş kabul edilmez. */
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  /** fullWidth=false iken yatay hizalama. */
  align?: "flex-start" | "center" | "flex-end";
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const z = SIZE[size];
  const p = palette(variant, colors);
  const inactive = disabled || loading;
  const press = usePressScale();
  const fg = disabled ? p.dfg : p.fg;
  const wrap: ViewStyle = fullWidth ? { alignSelf: "stretch" } : { alignSelf: align };

  return (
    <Animated.View style={[wrap, { transform: [{ scale: press.v }] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: !!inactive, busy: !!loading }}
        disabled={inactive}
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        style={({ pressed }) => [
          styles.base,
          {
            height: z.h, paddingHorizontal: z.px, borderRadius: z.r, gap: z.gap, minWidth: z.min,
            backgroundColor: disabled ? p.dbg : pressed ? p.pressed : p.bg,
            borderWidth: "line" in p && p.line ? 1 : 0,
            borderColor: "line" in p && p.line ? (disabled ? colors.borderDefault : p.line) : undefined,
          },
        ]}
      >
        <View style={[styles.row, { gap: z.gap, opacity: loading ? 0 : 1 }]}>
          {icon ? <Icon name={icon} size={z.icon} color={disabled ? "actionOnDisabled" : variant === "ghost" ? "textLink" : variant === "primary" ? "actionOnPrimary" : variant === "destructive" ? "actionOnDestructive" : "iconPrimary"} /> : null}
          <Text variant={z.label} style={{ color: fg }} numberOfLines={1}>{label}</Text>
        </View>
        {loading ? (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={styles.center}><ActivityIndicator size="small" color={fg} /></View>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

export function IconButton({
  icon, onPress, label, variant = "plain", size = "L", disabled, iconColor,
}: {
  icon: IconName; onPress?: () => void; label: string;
  variant?: "filled" | "tonal" | "outline" | "plain"; size?: "L" | "M" | "S"; disabled?: boolean;
  iconColor?: keyof Colors;
}) {
  const { colors } = useTheme();
  const d = size === "L" ? 44 : size === "M" ? 36 : 28;
  const is = size === "L" ? 20 : size === "M" ? 18 : 16;
  const bg = variant === "filled" ? colors.actionPrimary : variant === "tonal" ? colors.actionSecondary : variant === "outline" ? colors.bgSurface : "transparent";
  const fg: keyof Colors = iconColor ?? (variant === "filled" ? "actionOnPrimary" : variant === "tonal" ? "actionOnSecondary" : "iconPrimary");
  // S ve M görsel olarak küçük: dokunma alanı hitSlop ile 44'e tamamlanır.
  const slop = Math.max(0, (44 - d) / 2);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={slop}
      style={({ pressed }) => [
        { width: d, height: d, borderRadius: radius.full, alignItems: "center", justifyContent: "center", backgroundColor: bg, opacity: disabled ? 0.4 : 1 },
        variant === "outline" ? { borderWidth: 1, borderColor: colors.borderDefault } : null,
        pressed ? { backgroundColor: variant === "plain" ? colors.actionSecondary : bg, opacity: 0.8 } : null,
      ]}
    >
      <Icon name={icon} size={is} color={fg} />
    </Pressable>
  );
}

export function Fab({ label, icon = "plus", onPress, extended = true }: { label: string; icon?: IconName; onPress: () => void; extended?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        elevation.e2,
        {
          height: 56, minWidth: 56, borderRadius: radius.full, paddingHorizontal: extended ? 20 : 0,
          flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
          backgroundColor: pressed ? colors.actionPrimaryPressed : colors.actionPrimary,
        },
      ]}
    >
      <Icon name={icon} size={24} color="actionOnPrimary" />
      {extended ? <Text variant="labelL" color="actionOnPrimary">{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center", flexDirection: "row" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
