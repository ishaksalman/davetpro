import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { format, parseISO, startOfMonth } from "date-fns";
import { useTheme } from "~/design/theme";
import { formatDate } from "@/lib/format";
import { todayISO } from "@/lib/time";
import { FieldShell, SearchBar } from "./Inputs";
import { Icon } from "./Icon";
import { MonthCalendar } from "./MonthCalendar";
import { BottomSheet } from "./Sheet";
import { Text } from "./Text";
import { VenueDot } from "./Badge";
import { Button } from "./Button";

export type Option<T extends string = string> = { value: T; label: string; hint?: string; color?: string };

/**
 * Seçim alanı. Dokununca bottom sheet'te liste açılır (≤ 7 seçenek) veya arama + liste.
 * Native picker kullanılmaz: iki platformda aynı görünür.
 */
export function SelectField<T extends string>({
  label, value, options, onChange, placeholder = "Seçin", error, disabled, searchPlaceholder = "Ara…", emptyText = "Seçenek yok.",
}: {
  label: string; value: T | null | undefined; options: Option<T>[]; onChange: (v: T) => void;
  placeholder?: string; error?: string | null; disabled?: boolean; searchPlaceholder?: string; emptyText?: string;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const current = options.find((o) => o.value === value);
  const searchable = options.length > 7;
  const filtered = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("tr-TR");
    if (!needle) return options;
    return options.filter((o) => `${o.label} ${o.hint ?? ""}`.toLocaleLowerCase("tr-TR").includes(needle));
  }, [options, q]);

  return (
    <>
      <Pressable
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${current?.label ?? placeholder}`}
        onPress={() => { setQ(""); setOpen(true); }}
      >
        <FieldShell label={label} error={error} disabled={disabled}>
          {current?.color ? <VenueDot color={current.color} /> : null}
          <Text variant="body" color={current ? (disabled ? "textDisabled" : "textPrimary") : "textTertiary"} style={{ flex: 1 }} numberOfLines={1}>
            {current?.label ?? placeholder}
          </Text>
          <Icon name="chevron-down" size={20} color="iconSecondary" />
        </FieldShell>
      </Pressable>
      <BottomSheet visible={open} title={label} onClose={() => setOpen(false)}>
        {searchable ? <SearchBar value={q} onChangeText={setQ} placeholder={searchPlaceholder} /> : null}
        {filtered.length === 0 ? <Text variant="subhead" color="textSecondary" align="center">{emptyText}</Text> : null}
        <View>
          {filtered.map((o) => {
            const sel = o.value === value;
            return (
              <Pressable
                key={o.value}
                accessibilityRole="radio"
                accessibilityState={{ selected: sel }}
                onPress={() => { onChange(o.value); setOpen(false); }}
                style={({ pressed }) => ({ minHeight: 52, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, borderRadius: 12, backgroundColor: pressed ? colors.actionSecondary : "transparent" })}
              >
                {o.color ? <VenueDot color={o.color} /> : null}
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium" numberOfLines={1}>{o.label}</Text>
                  {o.hint ? <Text variant="footnote" color="textSecondary" numberOfLines={1}>{o.hint}</Text> : null}
                </View>
                {sel ? <Icon name="check" size={20} color="textLink" /> : null}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </>
  );
}

export function DateField({
  label, value, onChange, error, clearable, placeholder = "Tarih seçin", minDate,
}: {
  label: string; value: string | null | undefined; onChange: (iso: string | null) => void;
  error?: string | null; clearable?: boolean; placeholder?: string; minDate?: string;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(format(startOfMonth(parseISO(value || todayISO())), "yyyy-MM-dd"));
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ? formatDate(value) : placeholder}`}
        onPress={() => { setMonth(format(startOfMonth(parseISO(value || todayISO())), "yyyy-MM-dd")); setOpen(true); }}
      >
        <FieldShell label={label} error={error}>
          <Icon name="calendar" size={20} color="iconSecondary" />
          <Text variant="body" color={value ? "textPrimary" : "textTertiary"} style={{ flex: 1 }}>
            {value ? formatDate(value) : placeholder}
          </Text>
        </FieldShell>
      </Pressable>
      <BottomSheet visible={open} title={label} onClose={() => setOpen(false)}>
        <MonthCalendar
          month={month} onMonthChange={setMonth} selected={value} minDate={minDate}
          onSelect={(iso) => { onChange(iso); setOpen(false); }}
        />
        {clearable && value ? <Button label="Tarihi temizle" variant="ghost" size="M" onPress={() => { onChange(null); setOpen(false); }} /> : null}
      </BottomSheet>
    </>
  );
}
