import { forwardRef, useState, type ReactNode } from "react";
import { Platform, Pressable, Switch as RNSwitch, TextInput, View, type TextInputProps } from "react-native";
import { useTheme } from "~/design/theme";
import { radius } from "~/design/tokens";
import { fontFamily, text } from "~/design/typography";
import { formatMoneyInput, formatTimeInput, moneyToInput, parseMoneyInput } from "~/lib/domain/money-input";
import { useErrorAnchor } from "./FormScroll";
import { Icon, type IconName } from "./Icon";
import { Text } from "./Text";

/**
 * Tek satırlık girişlerde lineHeight verilmez: iOS'ta TextInput, yazıyı satır kutusunun
 * üstüne hizalar; 24 pt satır yüksekliği metni alanın ortasından aşağı iterdi.
 */
const singleLine = { ...text.body, lineHeight: undefined, paddingVertical: 0 } as const;

type FieldShellProps = {
  label?: string;
  error?: string | null;
  helper?: string;
  disabled?: boolean;
  focused?: boolean;
  children: ReactNode;
};

/** Etiket her zaman alanın üstünde ve görünür; hata alanın altında, ikonla. */
export function FieldShell({ label, error, helper, disabled, focused, children }: FieldShellProps) {
  const { colors } = useTheme();
  const anchor = useErrorAnchor(!!error);
  return (
    <View ref={anchor} collapsable={false} style={{ gap: 8 }}>
      {label ? <Text variant="footnoteMedium" color={disabled ? "textDisabled" : "textSecondary"}>{label}</Text> : null}
      <View
        style={{
          minHeight: 52, paddingHorizontal: 14, gap: 10, borderRadius: radius.md, flexDirection: "row", alignItems: "center",
          backgroundColor: disabled ? colors.bgSurfaceSunken : colors.bgSurface,
          borderWidth: focused || error ? 1.5 : 1,
          borderColor: error ? colors.feedbackDanger : focused ? colors.borderFocus : colors.borderDefault,
        }}
      >
        {children}
      </View>
      {error ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }} accessibilityLiveRegion="polite">
          <Icon name="circle-alert" size={16} color="feedbackDanger" />
          <Text variant="footnote" color="feedbackDanger" style={{ flex: 1 }}>{error}</Text>
        </View>
      ) : helper ? (
        <Text variant="footnote" color="textTertiary">{helper}</Text>
      ) : null}
    </View>
  );
}

export type TextFieldProps = Omit<TextInputProps, "style"> & {
  label?: string; error?: string | null; helper?: string; icon?: IconName; disabled?: boolean;
};

export const TextField = forwardRef<React.ComponentRef<typeof TextInput>, TextFieldProps>(function TextField(
  { label, error, helper, icon, disabled, secureTextEntry, multiline, onFocus, onBlur, ...rest }, ref,
) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secureTextEntry);
  return (
    <FieldShell label={label} error={error} helper={helper} disabled={disabled} focused={focused}>
      {icon ? <Icon name={icon} size={20} color="iconSecondary" /> : null}
      <TextInput
        ref={ref}
        {...rest}
        editable={!disabled}
        multiline={multiline}
        secureTextEntry={hidden}
        placeholderTextColor={colors.textTertiary}
        accessibilityLabel={label}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        // 16 pt altına inmez (iOS odakta yakınlaştırmasın).
        style={[
          multiline ? text.body : singleLine,
          { flex: 1, color: disabled ? colors.textDisabled : colors.textPrimary, minHeight: multiline ? 96 : 50, textAlignVertical: multiline ? "top" : "center" },
          multiline ? { paddingVertical: 14 } : null,
          // Plus Jakarta Sans'ın satır kutusu metni ~1,3 pt aşağı bırakır (placeholder ve şifre noktaları dahil); ikonlarla aynı eksene çekilir.
          !multiline && Platform.OS === "ios" ? { paddingBottom: 2 } : null,
          { fontFamily: fontFamily.regular },
        ]}
      />
      {secureTextEntry ? (
        <Pressable onPress={() => setHidden((h) => !h)} hitSlop={12} accessibilityRole="button" accessibilityLabel={hidden ? "Şifreyi göster" : "Şifreyi gizle"}>
          <Icon name={hidden ? "eye" : "eye-off"} size={20} color="iconSecondary" />
        </Pressable>
      ) : null}
    </FieldShell>
  );
});

export function SearchBar({ value, onChangeText, placeholder = "Ara" }: { value: string; onChangeText: (t: string) => void; placeholder?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ height: 40, paddingHorizontal: 12, gap: 8, borderRadius: radius.md, backgroundColor: colors.bgSurfaceSunken, flexDirection: "row", alignItems: "center" }}>
      <Icon name="search" size={18} color="textTertiary" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        accessibilityLabel={placeholder}
        returnKeyType="search"
        autoCorrect={false}
        style={[singleLine, { flex: 1, color: colors.textPrimary, padding: 0 }]}
      />
      {value ? (
        <Pressable onPress={() => onChangeText("")} hitSlop={12} accessibilityRole="button" accessibilityLabel="Aramayı temizle">
          <Icon name="circle-x" size={18} color="textTertiary" />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Tutar alanı: büyük ve ortada; değer her zaman `number` (kuruş hassasiyetli). */
export function MoneyField({
  value, onChange, label = "TUTAR", hint, error, autoFocus, compact,
}: {
  value: number | null | undefined; onChange: (n: number) => void; label?: string; hint?: string;
  error?: string | null; autoFocus?: boolean; compact?: boolean;
}) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [txt, setTxt] = useState(moneyToInput(value));
  // Dışarıdan gelen değer (ör. kişi başı hesap) metinle çelişiyorsa metni güncelle.
  const parsed = parseMoneyInput(txt) ?? 0;
  if (!focused && parsed !== (value ?? 0)) setTxt(moneyToInput(value));

  if (compact) {
    return (
      <FieldShell label={label} error={error} helper={hint} focused={focused}>
        <Text variant="body" color="textTertiary">₺</Text>
        <TextInput
          value={txt}
          onChangeText={(t) => { const f = formatMoneyInput(t); setTxt(f); onChange(parseMoneyInput(f) ?? 0); }}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.textTertiary}
          accessibilityLabel={label}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); setTxt(moneyToInput(parseMoneyInput(txt))); }}
          style={[singleLine, { flex: 1, minHeight: 50, color: colors.textPrimary }]}
        />
      </FieldShell>
    );
  }

  return (
    <View style={{ alignItems: "center", paddingVertical: 20, gap: 8 }}>
      <Text variant="overline" color="textTertiary">{label.toLocaleUpperCase("tr-TR")}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Text variant="titleLarge" color="textTertiary">₺</Text>
        <TextInput
          value={txt}
          autoFocus={autoFocus}
          onChangeText={(t) => { const f = formatMoneyInput(t); setTxt(f); onChange(parseMoneyInput(f) ?? 0); }}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.textTertiary}
          accessibilityLabel={label}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[text.numericXL, { color: colors.textPrimary, minWidth: 40, padding: 0 }]}
        />
      </View>
      {error ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }} accessibilityLiveRegion="polite">
          <Icon name="circle-alert" size={16} color="feedbackDanger" />
          <Text variant="footnote" color="feedbackDanger">{error}</Text>
        </View>
      ) : hint ? (
        <Text variant="footnote" color="textSecondary">{hint}</Text>
      ) : null}
    </View>
  );
}

/** 24 saat, "19:30". Native picker yok; iki platformda aynı görünür. */
export function TimeField({ label, value, onChange, error }: { label: string; value: string; onChange: (t: string) => void; error?: string | null }) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <FieldShell label={label} error={error} focused={focused}>
      <Icon name="clock" size={20} color="iconSecondary" />
      <TextInput
        value={value}
        onChangeText={(t) => onChange(formatTimeInput(t))}
        keyboardType="number-pad"
        placeholder="19:00"
        maxLength={5}
        placeholderTextColor={colors.textTertiary}
        accessibilityLabel={label}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[singleLine, { flex: 1, minHeight: 50, color: colors.textPrimary }]}
      />
    </FieldShell>
  );
}

export function FilterChip({ label, selected, onPress, count }: { label: string; selected?: boolean; onPress: () => void; count?: number }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={{
        height: 34, paddingHorizontal: 14, gap: 6, borderRadius: radius.full, flexDirection: "row", alignItems: "center",
        backgroundColor: selected ? colors.actionPrimary : colors.bgSurface,
        borderWidth: selected ? 0 : 1, borderColor: colors.borderDefault,
      }}
    >
      <Text variant="labelS" style={{ color: selected ? colors.actionOnPrimary : colors.textPrimary }}>{label}</Text>
      {count !== undefined ? (
        <View style={{ height: 18, paddingHorizontal: 6, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: selected ? "rgba(255,255,255,0.18)" : colors.actionSecondary }}>
          <Text variant="captionSmall" style={{ color: selected ? colors.actionOnPrimary : colors.textSecondary }}>{count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function SegmentedControl<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: "row", padding: 2, gap: 2, borderRadius: radius.md, backgroundColor: colors.bgSurfaceSunken }}>
      {options.map((o) => {
        const sel = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: sel }}
            onPress={() => onChange(o.value)}
            style={[
              { flex: 1, height: 32, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
              sel ? { backgroundColor: colors.bgSurfaceRaised, shadowColor: "#0b1220", shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 } : null,
            ]}
          >
            <Text variant="subheadSemibold" color={sel ? "textPrimary" : "textSecondary"} numberOfLines={1}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Switch({ value, onValueChange, label }: { value: boolean; onValueChange: (v: boolean) => void; label: string }) {
  const { colors, dark } = useTheme();
  return (
    <RNSwitch
      value={value}
      onValueChange={onValueChange}
      accessibilityLabel={label}
      trackColor={{ false: colors.controlTrackOff, true: colors.actionAccent }}
      // Koyu temada açık (beyaz) iz üzerinde topuz koyu olmalı, yoksa görünmez.
      thumbColor={dark && value ? colors.actionOnPrimary : colors.staticWhite}
    />
  );
}

export function Stepper({ value, onChange, min = 0, max = 99999 }: { value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  const { colors } = useTheme();
  const btn = (icon: IconName, delta: number, label: string) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => onChange(Math.max(min, Math.min(max, value + delta)))} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
      <Icon name={icon} size={18} />
    </Pressable>
  );
  return (
    <View style={{ height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: colors.bgSurface, flexDirection: "row", alignItems: "center", alignSelf: "flex-start" }}>
      {btn("minus", -1, "Azalt")}
      <View style={{ width: 1, height: 20, backgroundColor: colors.borderDefault }} />
      <View style={{ width: 64, alignItems: "center" }}><Text variant="numericM">{value}</Text></View>
      <View style={{ width: 1, height: 20, backgroundColor: colors.borderDefault }} />
      {btn("plus", 1, "Artır")}
    </View>
  );
}
