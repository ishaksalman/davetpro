import { View } from "react-native";
import { useTheme } from "~/design/theme";
import { radius } from "~/design/tokens";
import type { Colors } from "~/design/tokens";
import { initials } from "@/lib/format";
import { Icon } from "./Icon";
import { Text } from "./Text";

export type Tone = "success" | "info" | "warning" | "danger" | "violet" | "neutral";

const TONES: Record<Tone, { bg: keyof Colors; fg: keyof Colors; dot: keyof Colors }> = {
  success: { bg: "feedbackSuccessSubtle", fg: "feedbackOnSuccessSubtle", dot: "feedbackSuccess" },
  info: { bg: "feedbackInfoSubtle", fg: "feedbackOnInfoSubtle", dot: "feedbackInfo" },
  warning: { bg: "feedbackWarningSubtle", fg: "feedbackOnWarningSubtle", dot: "feedbackWarning" },
  danger: { bg: "feedbackDangerSubtle", fg: "feedbackOnDangerSubtle", dot: "feedbackDanger" },
  violet: { bg: "feedbackVioletSubtle", fg: "feedbackOnVioletSubtle", dot: "feedbackViolet" },
  neutral: { bg: "feedbackNeutralSubtle", fg: "feedbackOnNeutralSubtle", dot: "textTertiary" },
};

/** Durum asla yalnızca renkle anlatılmaz: rozet her zaman metin taşır. */
export function StatusBadge({ label, tone, size = "M" }: { label: string; tone: Tone; size?: "M" | "S" }) {
  const { colors } = useTheme();
  const t = TONES[tone];
  const M = size === "M";
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={{
        height: M ? 24 : 20, paddingHorizontal: M ? 10 : 8, gap: M ? 6 : 5, borderRadius: radius.full,
        backgroundColor: colors[t.bg], flexDirection: "row", alignItems: "center", alignSelf: "flex-start",
      }}
    >
      <View style={{ width: M ? 6 : 5, height: M ? 6 : 5, borderRadius: 3, backgroundColor: colors[t.dot] }} />
      <Text variant={M ? "caption" : "captionSmall"} style={{ color: colors[t.fg] }} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export function CountBadge({ count }: { count: number }) {
  const { colors } = useTheme();
  if (count <= 0) return null;
  return (
    <View style={{ minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: 9, backgroundColor: colors.feedbackDanger, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.bgSurfaceRaised }}>
      <Text variant="captionSmall" color="staticWhite">{count > 99 ? "99+" : String(count)}</Text>
    </View>
  );
}

export function Avatar({ name, size = "M" }: { name?: string | null; size?: "S" | "M" | "L" }) {
  const { colors } = useTheme();
  const d = size === "S" ? 32 : size === "M" ? 40 : 56;
  const ini = name ? initials(name) : "";
  return (
    <View style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: colors.actionAccentSubtle, alignItems: "center", justifyContent: "center" }}>
      {ini ? (
        <Text variant={size === "S" ? "captionSmall" : size === "M" ? "subheadSemibold" : "title2"} color="textLink">{ini}</Text>
      ) : (
        <Icon name="user-round" size={size === "S" ? 16 : size === "M" ? 20 : 26} color="textLink" />
      )}
    </View>
  );
}

export function VenueDot({ color, size = 10 }: { color: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />;
}

export function VenueTag({ name, color }: { name: string; color: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <VenueDot color={color} size={8} />
      <Text variant="footnoteMedium" color="textSecondary" numberOfLines={1} style={{ flexShrink: 1 }}>{name}</Text>
    </View>
  );
}
