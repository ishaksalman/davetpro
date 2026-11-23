import { Text as RNText, type TextProps as RNTextProps } from "react-native";
import { useTheme } from "~/design/theme";
import { text, type TextVariant } from "~/design/typography";
import type { Colors } from "~/design/tokens";

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  color?: keyof Colors;
  align?: "left" | "center" | "right";
};

/**
 * Tek metin bileşeni. Yazı ölçeği büyütülünce (erişilebilirlik) çok taşmasın
 * diye üst sınır 1.4.
 */
export function Text({ variant = "body", color = "textPrimary", align, style, ...rest }: TextProps) {
  const { colors } = useTheme();
  return (
    <RNText
      maxFontSizeMultiplier={1.4}
      {...rest}
      style={[text[variant], { color: colors[color] }, align ? { textAlign: align } : null, style]}
    />
  );
}
