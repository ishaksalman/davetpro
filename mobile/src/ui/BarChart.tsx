import { View } from "react-native";
import { useTheme } from "~/design/theme";
import type { Colors } from "~/design/tokens";
import { barHeights } from "~/lib/domain/ranges";
import { Text } from "./Text";

export type BarPair = { label: string; a: number; b: number };

/**
 * İkili çubuk grafiği (Figma 06): her ay için iki çubuk, tüm çubuklar aynı ölçekte.
 * Renk tek başına anlam taşımaz: özet kartı etiketli, grafiğin erişilebilirlik metni var.
 */
export function BarPairChart({
  data, aColor, bColor, aName, bName, height = 96, format,
}: { data: BarPair[]; aColor: keyof Colors; bColor: keyof Colors; aName: string; bName: string; height?: number; format: (n: number) => string }) {
  const { colors } = useTheme();
  const heights = barHeights(data.flatMap((d) => [d.a, d.b]), height);
  const summary = data.map((d) => `${d.label}: ${aName} ${format(d.a)}, ${bName} ${format(d.b)}`).join("; ");
  return (
    <View accessible accessibilityLabel={`Aylık grafik. ${summary}`} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingHorizontal: 4 }}>
      {data.map((d, i) => (
        <View key={d.label} style={{ alignItems: "center", gap: 6 }}>
          <View style={{ height, flexDirection: "row", alignItems: "flex-end", gap: 4 }}>
            <View style={{ width: 12, height: heights[i * 2], borderRadius: 4, backgroundColor: colors[aColor] }} />
            <View style={{ width: 12, height: heights[i * 2 + 1], borderRadius: 4, backgroundColor: colors[bColor] }} />
          </View>
          <Text variant="caption" color="textTertiary">{d.label}</Text>
        </View>
      ))}
    </View>
  );
}
