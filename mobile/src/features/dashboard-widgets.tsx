import { useState } from "react";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import { useTheme } from "~/design/theme";
import { elevation } from "~/design/tokens";
import { formatMoneyCompact } from "@/lib/format";
import type { Trend } from "@/lib/trend";
import { Icon } from "~/ui/Icon";
import { Text } from "~/ui/Text";

// Figma "Dashboard 2026" hero: lacivert→yeşilimsi koyu degrade, nane vurgu, alan grafiği.
const mint = "#16E0B4";
const amber = "#F5B23D";
const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const CHART_H = 96;
const PAD = 8; // son nokta halesi kenarda kesilmesin

/** Catmull-Rom → kübik Bézier ile yumuşak eğri. */
function smoothPath(pts: [number, number][]): string {
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

function AreaChart({ series, width }: { series: { label: string; value: number }[]; width: number }) {
  const top = Math.max(1, ...series.map((s) => s.value));
  const n = series.length;
  const pts: [number, number][] = series.map((s, i) => [n === 1 ? width / 2 : PAD + (i * (width - 2 * PAD)) / (n - 1), CHART_H - 10 - (s.value / top) * (CHART_H - 24)]);
  const last = pts[pts.length - 1];
  const curve = n > 1 ? smoothPath(pts) : `M 0 ${last[1]} L ${width} ${last[1]}`;
  return (
    <View>
      <Svg width={width} height={CHART_H} style={{ overflow: "visible" }}>
        <Defs>
          <SvgGradient id="heroArea" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={mint} stopOpacity={0.38} />
            <Stop offset="1" stopColor={mint} stopOpacity={0} />
          </SvgGradient>
        </Defs>
        <Path d={`${curve} L ${width} ${CHART_H} L 0 ${CHART_H} Z`} fill="url(#heroArea)" />
        <Path d={curve} stroke={mint} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Circle cx={last[0]} cy={last[1]} r={9} fill={mint} fillOpacity={0.25} />
        <Circle cx={last[0]} cy={last[1]} r={5} fill="#fff" stroke={mint} strokeWidth={3} />
      </Svg>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
        {series.map((s, i) => (
          <Text key={s.label + i} variant="captionSmall" style={{ color: "#fff", opacity: i === n - 1 ? 1 : 0.5, fontWeight: i === n - 1 ? "800" : "600" }}>{s.label}</Text>
        ))}
      </View>
    </View>
  );
}

/**
 * Panel kahramanı (Figma "Dashboard 2026"): koyu degrade üstünde bu ayın tahsilatı, artış rozeti,
 * son 6 ayın yumuşak alan grafiği ve iki alt metrik hücresi. Tutar yetkisizde hiç çizilmez
 * (çağıran kontrol eder).
 */
export function HeroCard({
  label, value, trend, series, footLabel, footValue, foot2Label, foot2Value,
}: {
  label: string; value: string; trend?: Trend | null;
  series: { label: string; value: number }[]; footLabel: string; footValue: string;
  foot2Label?: string; foot2Value?: string;
}) {
  const [w, setW] = useState(0);
  const up = trend?.direction === "up";
  const now = new Date();
  const period = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  return (
    <LinearGradient
      colors={["#0F1D44", "#0A1230", "#07261F"]}
      locations={[0, 0.55, 1]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[elevation.e2, { borderRadius: 28, padding: 22, gap: 18, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }]}
    >
      <Svg width={220} height={220} style={{ position: "absolute", right: -40, top: -70 }} pointerEvents="none">
        <Defs>
          <RadialGradient id="heroGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={mint} stopOpacity={0.28} />
            <Stop offset="1" stopColor={mint} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={220} height={220} fill="url(#heroGlow)" />
      </Svg>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: mint }} />
          <Text variant="footnoteMedium" style={{ color: "rgba(255,255,255,0.75)" }}>{label}</Text>
        </View>
        <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.12)" }}>
          <Text variant="captionSmall" style={{ color: "#fff" }}>{period}</Text>
        </View>
      </View>

      <View accessible accessibilityLabel={`${label}: ${value}`} style={{ flexDirection: "row", alignItems: "flex-end", gap: 12 }}>
        <Text variant="display" style={{ color: "#fff", fontSize: 42, lineHeight: 52, flexShrink: 1 }} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
        {trend && trend.direction !== "flat" ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, height: 22, marginBottom: 6, borderRadius: 999, backgroundColor: up ? "rgba(22,224,180,0.18)" : "rgba(236,68,88,0.22)" }}>
            <Icon name={up ? "trending-up" : "trending-down"} size={12} tint={up ? mint : "#FF8A98"} />
            <Text variant="captionSmall" style={{ color: up ? mint : "#FF8A98" }}>{up ? "+" : "−"}%{trend.percent}</Text>
          </View>
        ) : null}
      </View>

      {series.length > 0 ? (
        <View
          onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}
          accessible accessibilityLabel={`Son ${series.length} ay tahsilat: ${series.map((s) => `${s.label} ${formatMoneyCompact(s.value)}`).join(", ")}`}
        >
          {w > 0 ? <AreaChart series={series} width={w} /> : <View style={{ height: CHART_H + 20 }} />}
        </View>
      ) : null}

      <View style={{ flexDirection: "row", gap: 10 }}>
        <FootCell label={footLabel} value={footValue} color={amber} />
        {foot2Label && foot2Value ? <FootCell label={foot2Label} value={foot2Value} /> : null}
      </View>
    </LinearGradient>
  );
}

function FootCell({ label, value, color = "#fff" }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flex: 1, gap: 4, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
      <Text variant="caption" style={{ color: "rgba(255,255,255,0.6)" }} numberOfLines={1}>{label}</Text>
      <Text variant="numericM" style={{ color }} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}

/** Figma "Bu ay" kartı: büyük sayı + son 6 ayın iş sayısı çubukları (bu ay vurgulu, altında ay adı). */
export function MonthWeekCard({ count, unit, months }: { count: number; unit: string; months: { label: string; count: number }[] }) {
  const { colors } = useTheme();
  const max = Math.max(1, ...months.map((m) => m.count));
  const last = months.length - 1;
  return (
    <View
      accessible
      accessibilityLabel={`Bu ay ${count} ${unit}. Son ${months.length} ay: ${months.map((m) => `${m.label} ${m.count}`).join(", ")}`}
      style={[elevation.e1, { flex: 1, padding: 18, gap: 14, borderRadius: 24, backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.borderSubtle }]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Icon name="calendar-check" size={15} color="iconPrimary" />
        <Text variant="footnoteMedium" color="textSecondary" style={{ fontWeight: "700" }}>Bu ay</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
        <Text variant="numericL" style={{ fontSize: 36, lineHeight: 46, letterSpacing: -1, paddingRight: 4 }}>{count}</Text>
        <Text variant="caption" color="textTertiary" numberOfLines={1} style={{ flexShrink: 1, marginBottom: 5, fontWeight: "600" }}>{unit}</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", height: 56 }}>
        {months.map((m, i) => (
          <View key={m.label + i} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 5 }}>
            <View style={{ width: 10, height: m.count === 0 ? 4 : 8 + Math.round((m.count / max) * 30), borderRadius: 4, backgroundColor: i === last ? colors.brandBlue : colors.bgSurfaceSunken, borderWidth: i === last ? 0 : 1, borderColor: colors.borderSubtle }} />
            <Text variant="captionSmall" color={i === last ? "textPrimary" : "textTertiary"} style={{ fontSize: 9, letterSpacing: 0, fontWeight: i === last ? "800" : "600" }} numberOfLines={1}>{m.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Figma "Doluluk" kartı: bu ayın doluluk halkası + altında geçen aya göre değişim rozeti. */
export function OccupancyCard({ percent, trend }: { percent: number; trend: Trend | null }) {
  const dir = trend?.direction;
  const { colors } = useTheme();
  const size = 84, stroke = 8, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const month = MONTHS[new Date().getMonth()];
  return (
    <View
      accessible accessibilityLabel={`${month} doluluğu %${percent}${trend ? `. ${trend.label}` : ""}`}
      style={[elevation.e1, { flex: 1, padding: 18, gap: 12, borderRadius: 24, alignItems: "center", backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.borderSubtle }]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" }}>
        <Icon name="trending-up" size={15} color="feedbackOnSuccessSubtle" />
        <Text variant="footnoteMedium" color="textSecondary" style={{ fontWeight: "700" }} numberOfLines={1}>Doluluk · {month}</Text>
      </View>
      <View style={{ flex: 1, alignSelf: "stretch", alignItems: "center", justifyContent: "center", gap: 12 }}>
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.bgSurfaceSunken} strokeWidth={stroke} fill="none" />
          {/* %0'da çizilmez: yuvarlak uçlu sıfır uzunluklu çizgi halkanın tepesinde nokta bırakır. */}
          {percent > 0 ? <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.feedbackSuccess} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${(c * percent) / 100} ${c}`} /> : null}
        </Svg>
        <Text variant="numericM" style={{ fontSize: 18, fontWeight: "800" }}>%{percent}</Text>
      </View>
      {trend ? (
        <View accessibilityLabel={trend.label} style={{ flexDirection: "row", alignItems: "center", gap: 3, height: 22, paddingHorizontal: 8, borderRadius: 11, backgroundColor: dir === "up" ? colors.feedbackSuccessSubtle : dir === "down" ? colors.feedbackDangerSubtle : colors.bgSurfaceSunken }}>
          {dir === "up" || dir === "down" ? <Icon name={dir === "up" ? "trending-up" : "trending-down"} size={12} color={dir === "up" ? "feedbackOnSuccessSubtle" : "feedbackOnDangerSubtle"} /> : null}
          <Text variant="captionSmall" color={dir === "up" ? "feedbackOnSuccessSubtle" : dir === "down" ? "feedbackOnDangerSubtle" : "textTertiary"} numberOfLines={1}>{dir === "flat" ? "Aynı" : `${dir === "up" ? "+" : "−"}%${trend.percent}`}</Text>
        </View>
      ) : null}
      </View>
    </View>
  );
}
