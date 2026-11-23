import type { TextStyle } from "react-native";

/**
 * Figma metin stilleri (Mobile/…). Yazı tipi: Plus Jakarta Sans (denemesi; Figma'da Manrope). Harf aralığı Figma'da % olarak tutuluyor;
 * RN px ister → boyut × yüzde / 100.
 */
export const fontFamily = {
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semibold: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
} as const;

type W = keyof typeof fontFamily;
const t = (weight: W, fontSize: number, lineHeight: number, pct: number): TextStyle => ({
  fontFamily: fontFamily[weight],
  fontSize,
  lineHeight,
  letterSpacing: (fontSize * pct) / 100,
});

export const text = {
  display: t("bold", 34, 40, -2.5),
  titleLarge: t("bold", 28, 34, -2),
  title1: t("bold", 22, 28, -1.5),
  title2: t("semibold", 18, 24, -1),
  headline: t("semibold", 16, 22, -0.5),
  body: t("regular", 16, 24, -0.3),
  bodyMedium: t("medium", 16, 24, -0.3),
  subhead: t("regular", 14, 20, -0.2),
  subheadSemibold: t("semibold", 14, 20, -0.2),
  footnote: t("regular", 13, 18, 0),
  footnoteMedium: t("medium", 13, 18, 0),
  caption: t("medium", 12, 16, 0),
  captionSmall: t("semibold", 11, 14, 0.5),
  overline: t("bold", 11, 14, 6),
  labelL: t("semibold", 16, 20, -0.3),
  labelM: t("semibold", 15, 20, -0.2),
  labelS: t("semibold", 13, 16, 0),
  labelTab: t("semibold", 10, 12, 0.5),
  numericXL: { ...t("bold", 34, 40, -3), fontVariant: ["tabular-nums"] } as TextStyle,
  numericL: { ...t("bold", 24, 30, -2), fontVariant: ["tabular-nums"] } as TextStyle,
  numericM: { ...t("semibold", 17, 22, -1), fontVariant: ["tabular-nums"] } as TextStyle,
  numericS: { ...t("semibold", 14, 18, -0.5), fontVariant: ["tabular-nums"] } as TextStyle,
} as const;

export type TextVariant = keyof typeof text;
