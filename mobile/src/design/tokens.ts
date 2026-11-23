/**
 * Tasarım token'ları — Figma "DavetPro — Mobile App" dosyasındaki
 * Foundations değişkenlerinin birebir karşılığı (Primitives → Semantic).
 * Ekranlar ham renk kullanmaz; yalnızca semantic adlar.
 */
const P = {
  neutral: {
    0: "#ffffff", 25: "#fafbfc", 50: "#f5f6f8", 100: "#eef0f3", 150: "#e4e7ec", 200: "#d9dde4",
    300: "#c3c9d3", 400: "#a3abb9", 500: "#7a8396", 600: "#5b6477", 700: "#3f4859",
    800: "#262e3c", 850: "#1b2230", 900: "#141925", 950: "#0b1220",
  },
  night: {
    canvas: "#0a0d13", sunken: "#0e1118", surface: "#13171f", raised: "#1a1f29",
    line: "#ffffff14", lineStrong: "#ffffff29", tonal: "#ffffff0f", tonalPressed: "#ffffff1c",
  },
  blue: { 50: "#edf2ff", 100: "#dbe5ff", 200: "#b8cbff", 400: "#7aa0ff", 500: "#3d74ff", 600: "#1a5cff", 700: "#1146d6", 900: "#0d2566", 950: "#0f1b3d" },
  mint: { 500: "#16e0b4" },
  cyan: { 500: "#0fbfd8" },
  green: { 50: "#e8f8f1", 400: "#3fd09c", 500: "#19b37e", 600: "#0b9a6a", 700: "#087a54", 950: "#0b2a20" },
  amber: { 50: "#fff6e5", 400: "#f5b23d", 600: "#c27a00", 700: "#9a5f00", 950: "#2e2108" },
  red: { 50: "#fff0f1", 400: "#ff7a85", 500: "#ec4458", 600: "#d92d45", 700: "#b21d35", 950: "#33121a" },
  violet: { 50: "#f3f0ff", 400: "#ad98ff", 600: "#6d4fe0", 700: "#5839c4", 950: "#1f1840" },
  scrimLight: "#0b122066",
  scrimDark: "#000000a6",
} as const;

export type Colors = {
  bgCanvas: string; bgSurface: string; bgSurfaceRaised: string; bgSurfaceSunken: string;
  bgInverse: string; bgScrim: string;
  textPrimary: string; textSecondary: string; textTertiary: string; textDisabled: string;
  textInverse: string; textLink: string;
  iconPrimary: string; iconSecondary: string;
  borderSubtle: string; borderDefault: string; borderStrong: string; borderFocus: string;
  actionPrimary: string; actionPrimaryPressed: string; actionOnPrimary: string;
  actionSecondary: string; actionSecondaryPressed: string; actionOnSecondary: string;
  actionAccent: string; actionAccentSubtle: string;
  actionDestructive: string; actionDestructivePressed: string; actionOnDestructive: string;
  actionDisabled: string; actionOnDisabled: string;
  feedbackSuccess: string; feedbackSuccessSubtle: string; feedbackOnSuccessSubtle: string;
  feedbackWarning: string; feedbackWarningSubtle: string; feedbackOnWarningSubtle: string;
  feedbackDanger: string; feedbackDangerSubtle: string; feedbackOnDangerSubtle: string;
  feedbackInfo: string; feedbackInfoSubtle: string; feedbackOnInfoSubtle: string;
  feedbackViolet: string; feedbackVioletSubtle: string; feedbackOnVioletSubtle: string;
  feedbackNeutralSubtle: string; feedbackOnNeutralSubtle: string;
  inverseSuccess: string; inverseDanger: string; inverseInfo: string; inverseLink: string;
  moneyIncome: string; moneyExpense: string; moneyOutstanding: string;
  brandNavy: string; brandBlue: string; brandCyan: string; brandMint: string;
  staticWhite: string; controlTrackOff: string;
  chartMuted: string;
};

export const lightColors: Colors = {
  bgCanvas: P.neutral[50], bgSurface: P.neutral[0], bgSurfaceRaised: P.neutral[0],
  bgSurfaceSunken: P.neutral[100], bgInverse: P.neutral[950], bgScrim: P.scrimLight,
  textPrimary: P.neutral[950], textSecondary: P.neutral[600], textTertiary: P.neutral[500],
  textDisabled: P.neutral[400], textInverse: P.neutral[0], textLink: P.blue[600],
  iconPrimary: P.neutral[950], iconSecondary: P.neutral[500],
  borderSubtle: P.neutral[100], borderDefault: P.neutral[150], borderStrong: P.neutral[300], borderFocus: P.blue[600],
  actionPrimary: P.neutral[950], actionPrimaryPressed: P.neutral[800], actionOnPrimary: P.neutral[0],
  actionSecondary: P.neutral[100], actionSecondaryPressed: P.neutral[150], actionOnSecondary: P.neutral[950],
  actionAccent: P.neutral[950], actionAccentSubtle: P.blue[50],
  actionDestructive: P.red[600], actionDestructivePressed: P.red[700], actionOnDestructive: P.neutral[0],
  actionDisabled: P.neutral[100], actionOnDisabled: P.neutral[400],
  feedbackSuccess: P.green[600], feedbackSuccessSubtle: P.green[50], feedbackOnSuccessSubtle: P.green[700],
  feedbackWarning: P.amber[600], feedbackWarningSubtle: P.amber[50], feedbackOnWarningSubtle: P.amber[700],
  feedbackDanger: P.red[600], feedbackDangerSubtle: P.red[50], feedbackOnDangerSubtle: P.red[700],
  feedbackInfo: P.blue[600], feedbackInfoSubtle: P.blue[50], feedbackOnInfoSubtle: P.blue[700],
  feedbackViolet: P.violet[600], feedbackVioletSubtle: P.violet[50], feedbackOnVioletSubtle: P.violet[700],
  feedbackNeutralSubtle: P.neutral[100], feedbackOnNeutralSubtle: P.neutral[700],
  inverseSuccess: P.green[400], inverseDanger: P.red[400], inverseInfo: P.blue[400], inverseLink: P.blue[200],
  moneyIncome: P.green[600], moneyExpense: P.red[600], moneyOutstanding: P.neutral[950],
  brandNavy: P.neutral[950], brandBlue: P.blue[600], brandCyan: P.cyan[500], brandMint: P.mint[500],
  staticWhite: P.neutral[0], controlTrackOff: P.neutral[200],
  chartMuted: P.neutral[150],
};

export const darkColors: Colors = {
  bgCanvas: P.night.canvas, bgSurface: P.night.surface, bgSurfaceRaised: P.night.raised,
  bgSurfaceSunken: P.night.sunken, bgInverse: P.neutral[50], bgScrim: P.scrimDark,
  textPrimary: P.neutral[50], textSecondary: P.neutral[300], textTertiary: P.neutral[500],
  textDisabled: P.neutral[700], textInverse: P.neutral[950], textLink: P.blue[400],
  iconPrimary: P.neutral[50], iconSecondary: P.neutral[400],
  borderSubtle: P.night.line, borderDefault: P.night.line, borderStrong: P.night.lineStrong, borderFocus: P.blue[400],
  actionPrimary: P.neutral[50], actionPrimaryPressed: P.neutral[200], actionOnPrimary: P.neutral[950],
  actionSecondary: P.night.tonal, actionSecondaryPressed: P.night.tonalPressed, actionOnSecondary: P.neutral[50],
  actionAccent: P.neutral[50], actionAccentSubtle: P.blue[950],
  actionDestructive: P.red[500], actionDestructivePressed: P.red[600], actionOnDestructive: P.neutral[0],
  actionDisabled: P.night.tonal, actionOnDisabled: P.neutral[700],
  feedbackSuccess: P.green[400], feedbackSuccessSubtle: P.green[950], feedbackOnSuccessSubtle: P.green[400],
  feedbackWarning: P.amber[400], feedbackWarningSubtle: P.amber[950], feedbackOnWarningSubtle: P.amber[400],
  feedbackDanger: P.red[400], feedbackDangerSubtle: P.red[950], feedbackOnDangerSubtle: P.red[400],
  feedbackInfo: P.blue[400], feedbackInfoSubtle: P.blue[950], feedbackOnInfoSubtle: P.blue[400],
  feedbackViolet: P.violet[400], feedbackVioletSubtle: P.violet[950], feedbackOnVioletSubtle: P.violet[400],
  feedbackNeutralSubtle: P.night.tonal, feedbackOnNeutralSubtle: P.neutral[300],
  inverseSuccess: P.green[600], inverseDanger: P.red[600], inverseInfo: P.blue[600], inverseLink: P.blue[700],
  moneyIncome: P.green[400], moneyExpense: P.red[400], moneyOutstanding: P.neutral[50],
  brandNavy: P.neutral[950], brandBlue: P.blue[600], brandCyan: P.cyan[500], brandMint: P.mint[500],
  staticWhite: P.neutral[0], controlTrackOff: P.night.lineStrong,
  chartMuted: P.night.tonalPressed,
};

/** Salon renkleri — src/lib/constants.ts VENUE_COLORS ile aynı sıra (venue/1…8). */
export { VENUE_COLORS } from "@/lib/constants";

export const space = { 0: 0, 2: 2, 4: 4, 6: 6, 8: 8, 10: 10, 12: 12, 16: 16, 20: 20, 24: 24, 32: 32, 40: 40, 48: 48, 64: 64 } as const;
export const radius = { xs: 6, sm: 10, md: 12, lg: 16, xl: 20, "2xl": 28, full: 999 } as const;
export const size = {
  touchMin: 44, controlL: 52, controlM: 44, controlS: 34,
  iconS: 16, iconM: 20, iconL: 24,
  gutter: 16, sectionGap: 28, navBar: 44, tabBar: 49,
} as const;

/** Figma gölge stilleri (Elevation/1-3) → RN. */
export const elevation = {
  e1: { shadowColor: "#0b1220", shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  e2: { shadowColor: "#0b1220", shadowOpacity: 0.14, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  e3: { shadowColor: "#0b1220", shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: -4 }, elevation: 12 },
  dialog: { shadowColor: "#0b1220", shadowOpacity: 0.28, shadowRadius: 24, shadowOffset: { width: 0, height: 24 }, elevation: 16 },
} as const;
