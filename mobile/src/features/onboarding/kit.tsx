import { useId, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fontFamily } from "~/design/typography";
import { Icon, type IconName } from "~/ui/Icon";
import { Text } from "~/ui/Text";

/** Tanıtım hikâyesi her iki temada da koyu: marka anı, sistem temasına uymaz (Figma: "Onboarding 2026"). */
export const O = {
  navy: "#0B1220", navy2: "#141925", blue: "#3D74FF", blueDeep: "#1A5CFF", mint: "#16E0B4", mintText: "#7CF0C8",
  cyan: "#0FBFD8", green: "#19B37E", red: "#EC4458", redText: "#FF7A85", violet: "#6D4FE0", white: "#FFFFFF",
} as const;
export const white = (a: number) => `rgba(255,255,255,${a})`;

/** Bulanık ışık lekesi: RN'de blur yok, radyal gradyanla aynı görünüm. */
export function Glow({ color, size, x, y, opacity = 0.5 }: { color: string; size: number; x: number; y: number; opacity?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <Svg width={size} height={size} style={{ position: "absolute", left: x, top: y }} pointerEvents="none">
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={opacity} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width={size} height={size} fill={`url(#${id})`} />
    </Svg>
  );
}

/**
 * Koyu sahne. `header` ve `footer` SABİT durur; ortadaki içerik kaydırılabilir.
 * Küçük ekranda ya da büyük yazı boyutunda içerik sığmazsa ana eylem düğmesi
 * ekran dışına itilmez, kullanıcı metni kaydırır.
 */
export function DarkScene({ glows, header, footer, children }: { glows: { color: string; size: number; x: number; y: number; opacity?: number }[]; header?: ReactNode; footer?: ReactNode; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: O.navy, overflow: "hidden" }}>
      {glows.map((g, i) => <Glow key={i} {...g} />)}
      <View style={{ flex: 1, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16, paddingHorizontal: 24 }}>
        {header}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
        >
          {children}
        </ScrollView>
        {footer ? <View style={{ paddingTop: 12 }}>{footer}</View> : null}
      </View>
    </View>
  );
}

export function GlassCard({ children, style, strong }: { children: ReactNode; style?: StyleProp<ViewStyle>; strong?: boolean }) {
  return (
    <View style={[{ backgroundColor: white(strong ? 0.1 : 0.06), borderColor: white(0.14), borderWidth: StyleSheet.hairlineWidth * 1.5, borderRadius: 26, padding: 16 }, style]}>
      {children}
    </View>
  );
}

export function Chip({ label, icon, color = O.white, bg = white(0.1) }: { label: string; icon?: IconName; color?: string; bg?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: bg, alignSelf: "flex-start" }}>
      {icon ? <Icon name={icon} size={14} color="staticWhite" /> : null}
      <Text variant="caption" style={{ color, fontFamily: fontFamily.semibold }}>{label}</Text>
    </View>
  );
}

/** Koyu zeminde beyaz hap buton (ana eylem). */
export function PillButton({ label, onPress, icon, ghost }: { label: string; onPress: () => void; icon?: IconName; ghost?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8,
        backgroundColor: ghost ? "transparent" : O.white, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <Text variant="labelL" style={{ color: ghost ? white(0.7) : O.navy, fontFamily: fontFamily.bold }}>{label}</Text>
      {icon && !ghost ? <Icon name={icon} size={18} color="staticWhite" /> : null}
    </Pressable>
  );
}

/** Üstte geri oku + hikâye çubukları + Atla. */
export function StoryHeader({ step, total, onSkip, onBack }: { step: number; total: number; onSkip: () => void; onBack?: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, height: 44 }}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Geri"
          onPress={onBack}
          hitSlop={8}
          style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: white(0.12) }}
        >
          <Icon name="chevron-left" size={20} color="staticWhite" />
        </Pressable>
      ) : null}
      <View style={{ flex: 1, flexDirection: "row", gap: 6 }} accessibilityLabel={`Adım ${step} / ${total}`}>
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: white(i < step ? 1 : 0.22) }} />
        ))}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Tanıtımı atla" onPress={onSkip} hitSlop={12}>
        <Text variant="subheadSemibold" style={{ color: white(0.7) }}>Atla</Text>
      </Pressable>
    </View>
  );
}

export function SlideText({ eyebrow, title, body, big }: { eyebrow?: string; title: string; body: string; big?: boolean }) {
  return (
    <View style={{ gap: 10 }}>
      {eyebrow ? <Text variant="overline" style={{ color: O.mint, letterSpacing: 1.4 }}>{eyebrow}</Text> : null}
      <Text
        accessibilityRole="header"
        style={{ color: O.white, fontFamily: fontFamily.bold, fontSize: big ? 38 : 34, lineHeight: big ? 43 : 40, letterSpacing: -1.1 }}
      >
        {title}
      </Text>
      <Text variant="body" style={{ color: white(0.68) }}>{body}</Text>
    </View>
  );
}
